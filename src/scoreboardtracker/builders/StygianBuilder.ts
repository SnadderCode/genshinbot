import {EmbedBuilder} from "discord.js";

import {ScoreBoardManager} from "../ScoreBoardManager";
import {UserStatistics} from "../UserStatistics";

export class StygianBuilder {
  private readonly manager: ScoreBoardManager;

  constructor(manager: ScoreBoardManager) {
    this.manager = manager;
  }

  public async build(): Promise<EmbedBuilder> {
    const users = await this.manager.getAchievementsLeaderboard();

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🏆 Achievement Leaderboard")
      .setDescription(
        users.length > 0
          ? users.map((user, index) => this.formatUser(user, index + 1)).join("\n\n")
          : "No player statistics available.",
      )
      .setTimestamp();

    return embed;
  }

  private async formatUser(user: UserStatistics, rank: number): Promise<string> {
    const medal = ["🥇", "🥈", "🥉"][rank - 1] ?? `**${rank}.**`;

    return `${medal} **UID: ${user.uid}**\n└ ${user.achievements}`;
  }
}
