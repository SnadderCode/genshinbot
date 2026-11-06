import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonInteraction,
	ButtonStyle,
	ChatInputCommandInteraction,
	EmbedBuilder,
	Message,
	MessageComponentInteraction,
} from "discord.js";

import {ScoreBoardType} from "./ScoreBoardType";
import {ScoreBoardManager} from "./ScoreBoardManager";

import {AchievementsBuilder} from "./builders/AchievementsBuilder";
import {FriendshipBuilder} from "./builders/FriendshipBuilder";
import {SpiralAbyssBuilder} from "./builders/SpiralAbyssBuilder";
import {TheaterBuilder} from "./builders/TheaterBuilder";
import {StygianBuilder} from "./builders/StygianBuilder";

export class ScoreBoard {
	private readonly manager: ScoreBoardManager
	private readonly achievementsBuilder: AchievementsBuilder;
	private readonly friendshipBuilder: FriendshipBuilder;
	private readonly spiralAbyssBuilder: SpiralAbyssBuilder;
	private readonly theaterBuilder: TheaterBuilder;
	private readonly stygianBuilder: StygianBuilder;

	constructor(manager: ScoreBoardManager) {
		this.manager = manager;
		this.achievementsBuilder = new AchievementsBuilder(manager);
		this.friendshipBuilder = new FriendshipBuilder(manager);
		this.spiralAbyssBuilder = new SpiralAbyssBuilder(manager);
		this.theaterBuilder = new TheaterBuilder(manager);
		this.stygianBuilder = new StygianBuilder(manager);
	}

	public async buildEmbed(type: ScoreBoardType): Promise<EmbedBuilder> {
		switch (type) {
			case ScoreBoardType.ACHIEVEMENTS:
				return await this.achievementsBuilder.build();

			case ScoreBoardType.FRIENDSHIP:
				return await this.friendshipBuilder.build();

			case ScoreBoardType.SPIRAL_ABYSS:
				return await this.spiralAbyssBuilder.build();

			case ScoreBoardType.THEATER:
				return await this.theaterBuilder.build();

			case ScoreBoardType.STYGIAN:
				return await this.stygianBuilder.build();

			default:
				throw new Error(`Invalid scoreboard type: ${type}`);
		}
	}
}
