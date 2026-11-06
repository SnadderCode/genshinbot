
import { EnkaClient } from "enka-network-api";
import { UserStatistics } from "./UserStatistics";

export class ScoreBoardManager {
    private readonly enka: EnkaClient;

    private readonly userStatisticsList: UserStatistics[] = [];
    private readonly userStatisticsCache = new Map<number, { statistics: UserStatistics; expiresAt: number }>();
    private readonly pendingUserFetches = new Map<number, Promise<UserStatistics>>();
    private requestQueue: Promise<void> = Promise.resolve();
    private lastEnkaRequestAt = 0;
    private rateLimitUntil = 0;

    private readonly minimumRequestIntervalMs = 2_000;
    private readonly rateLimitCooldownMs = 5 * 60_000;

    private readonly achievementsLeaderboard: UserStatistics[] = [];
    private readonly friendshipLevelsLeaderboard: UserStatistics[] = [];
    private readonly spiralAbyssLeaderboard: UserStatistics[] = [];
    private readonly imaginariumTheaterLeaderboard: UserStatistics[] = [];
    private readonly stygianOnslaughtLeaderboard: UserStatistics[] = [];

    public constructor() {
        this.enka = new EnkaClient({ requestTimeout: 15_000 });

        this.enka.cachedAssetsManager.cacheDirectoryPath = "./cache";
        this.enka.cachedAssetsManager.cacheDirectorySetup();
    }

    public async fetchUserStatistics(uid: number): Promise<UserStatistics> {
        const cached = this.userStatisticsCache.get(uid);
        if (cached && cached.expiresAt > Date.now()) return cached.statistics;
        if (Date.now() < this.rateLimitUntil) {
            throw new Error(`Enka rate limit cooldown is active for ${Math.ceil((this.rateLimitUntil - Date.now()) / 1000)} more seconds`);
        }

        const pending = this.pendingUserFetches.get(uid);
        if (pending) return pending;

        const request = this.fetchAndCacheUserStatistics(uid);
        this.pendingUserFetches.set(uid, request);
        try {
            return await request;
        } finally {
            this.pendingUserFetches.delete(uid);
        }
    }

    private async fetchAndCacheUserStatistics(uid: number): Promise<UserStatistics> {
        const user = await this.queueEnkaRequest(() => this.enka.fetchCollapsedUser(uid));
        const statistics = new UserStatistics(user);
        const ttlMilliseconds = Math.max(0, user.ttl) * 1000;
        this.userStatisticsCache.set(uid, {
            statistics,
            expiresAt: Date.now() + ttlMilliseconds,
        });
        console.log(`[Scoreboard] Cached statistics for UID ${uid} for ${user.ttl} seconds`);
        return statistics;
    }

    private queueEnkaRequest<T>(request: () => Promise<T>): Promise<T> {
        const queuedRequest = this.requestQueue.then(async () => {
            if (Date.now() < this.rateLimitUntil) {
                throw new Error("Enka rate limit cooldown is active; skipping request");
            }

            const waitMs = this.lastEnkaRequestAt + this.minimumRequestIntervalMs - Date.now();
            if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));

            this.lastEnkaRequestAt = Date.now();
            try {
                return await request();
            } catch (error) {
                if (typeof error === "object" && error !== null && "statusCode" in error && error.statusCode === 429) {
                    this.rateLimitUntil = Date.now() + this.rateLimitCooldownMs;
                    console.warn(`[Scoreboard] Enka rate limited the bot; pausing requests for ${this.rateLimitCooldownMs / 60_000} minutes.`);
                }
                throw error;
            }
        });

        this.requestQueue = queuedRequest.then(() => undefined, () => undefined);
        return queuedRequest;
    }

    public async updateUserStatistics(): Promise<void> {
        await Promise.all(
            this.userStatisticsList.map(user => user.update(this.enka))
        );

        this.updateLeaderboards();
    }

    public async setUids(uids: number[]): Promise<void> {
        const users: UserStatistics[] = [];

        for (const uid of uids) {
            try {
                users.push(await this.fetchUserStatistics(uid));
            } catch (error) {
                console.error(`[Scoreboard] Failed to fetch UID ${uid}:`, error);
                const stale = this.userStatisticsCache.get(uid);
                if (stale) users.push(stale.statistics);
            }
        }

        this.userStatisticsList.length = 0;
        this.userStatisticsList.push(...users);

        this.updateLeaderboards();
    }

    public getUserStatistics(): UserStatistics[] {
        return [...this.userStatisticsList];
    }

    private updateLeaderboards(): void {
        // Achievements: highest first
        this.replaceLeaderboard(
            this.achievementsLeaderboard,
            this.userStatisticsList,
            (a, b) => b.achievements - a.achievements
        );

        // Friendship: highest first
        this.replaceLeaderboard(
            this.friendshipLevelsLeaderboard,
            this.userStatisticsList,
            (a, b) => b.friendshipLevels - a.friendshipLevels
        );

        // Spiral Abyss: stars, floor and chamber
        this.replaceLeaderboard(
            this.spiralAbyssLeaderboard,
            this.userStatisticsList.filter(user => user.spiralAbyss !== undefined),
            (a, b) =>
                b.spiralAbyss!.stars - a.spiralAbyss!.stars ||
                b.spiralAbyss!.floor - a.spiralAbyss!.floor ||
                b.spiralAbyss!.chamber - a.spiralAbyss!.chamber
        );

        // Imaginarium Theater: stars, then act
        this.replaceLeaderboard(
            this.imaginariumTheaterLeaderboard,
            this.userStatisticsList.filter(user => user.imaginariumTheater !== undefined),
            (a, b) =>
                b.imaginariumTheater!.stars - a.imaginariumTheater!.stars ||
                b.imaginariumTheater!.act - a.imaginariumTheater!.act
        );

        // Stygian Onslaught: difficulty, then clear time
        this.replaceLeaderboard(
            this.stygianOnslaughtLeaderboard,
            this.userStatisticsList.filter(user => user.stygianOnslaught !== undefined),
            (a, b) =>
                b.stygianOnslaught!.difficulty - a.stygianOnslaught!.difficulty ||
                a.stygianOnslaught!.clearTime - b.stygianOnslaught!.clearTime
        );
    }

    private replaceLeaderboard(
        target: UserStatistics[],
        users: UserStatistics[],
        comparator: (a: UserStatistics, b: UserStatistics) => number
    ): void {
        const sorted = [...users].sort(
            (a, b) => comparator(a, b) || a.uid - b.uid
        );

        target.length = 0;
        target.push(...sorted);
    }

    public getAchievementsLeaderboard(): UserStatistics[] {
        return [...this.achievementsLeaderboard];
    }

    public getFriendshipLevelsLeaderboard(): UserStatistics[] {
        return [...this.friendshipLevelsLeaderboard];
    }

    public getSpiralAbyssLeaderboard(): UserStatistics[] {
        return [...this.spiralAbyssLeaderboard];
    }

    public getImaginariumTheaterLeaderboard(): UserStatistics[] {
        return [...this.imaginariumTheaterLeaderboard];
    }

    public getStygianOnslaughtLeaderboard(): UserStatistics[] {
        return [...this.stygianOnslaughtLeaderboard];
    }
}
