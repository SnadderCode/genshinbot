import type { EnkaClient, GenshinUser } from "enka-network-api";

export interface SpiralAbyss {
	floor: number;
	chamber: number;
	stars: number;
}

export interface ImaginariumTheater {
	act: number;
	stars: number;
	mode: number;
}

export interface StygianOnslaught {
	scheduleId: number;
	difficulty: number;
	clearTime: number;
}

export class UserStatistics {
	readonly uid: number;
	achievements: number;
	friendshipLevels: number;
	spiralAbyss?: SpiralAbyss;
	imaginariumTheater?: ImaginariumTheater;
	stygianOnslaught?: StygianOnslaught;

	constructor(user: GenshinUser) {
		this.uid = user.uid;
		this.achievements = user.achievements;
		this.friendshipLevels = user.maxFriendshipCount;

		this.spiralAbyss = user.spiralAbyss
			? {
					floor: user.spiralAbyss.floor,
					chamber: user.spiralAbyss.chamber,
					stars: user.spiralAbyss.stars,
				}
			: undefined;

		this.imaginariumTheater = user.theater
			? {
					act: user.theater.act,
					stars: user.theater.stars,
					mode: user.theater.mode.id,
				}
			: undefined;

		this.stygianOnslaught = user.stygian
			? {
					scheduleId: user.stygian.scheduleId,
					difficulty: user.stygian.difficulty,
					clearTime: user.stygian.clearTime,
				}
			: undefined;
	}

	async update(enka: EnkaClient): Promise<void> {
		const user = await enka.fetchCollapsedUser(this.uid);
		this.achievements = user.achievements;
		this.friendshipLevels = user.maxFriendshipCount;

		this.spiralAbyss = user.spiralAbyss
			? {
					floor: user.spiralAbyss.floor,
					chamber: user.spiralAbyss.chamber,
					stars: user.spiralAbyss.stars,
				}
			: undefined;

		this.imaginariumTheater = user.theater
			? {
					act: user.theater.act,
					stars: user.theater.stars,
					mode: user.theater.mode.id,
				}
			: undefined;

		this.stygianOnslaught = user.stygian
			? {
					scheduleId: user.stygian.scheduleId,
					difficulty: user.stygian.difficulty,
					clearTime: user.stygian.clearTime,
				}
			: undefined;
	}
}
