import {
    SlashCommandBuilder,
    ChatInputCommandInteraction
} from "discord.js";

import { ScoreBoardType } from "../scoreboardtracker/ScoreBoardType";
import { ScoreBoard } from "../scoreboardtracker/ScoreBoard";
import { ScoreBoardManager } from "../scoreboardtracker/ScoreBoardManager";

const players: number[] = [700061363, 702462438, 709249231, 710816180, 707864856];
const manager = new ScoreBoardManager();
const scoreBoard = new ScoreBoard(manager);

export const data = new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Displays a Genshin Impact leaderboard.")
    .addIntegerOption(option =>
        option
            .setName("type")
            .setDescription("Choose a leaderboard (0-4).")
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(4)
    );

export async function execute(
    interaction: ChatInputCommandInteraction
) {
    await interaction.deferReply();
    const type = interaction.options.getInteger("type", true) as ScoreBoardType;
    await manager.setUids(players);
    const embed = await scoreBoard.buildEmbed(type);
    await interaction.editReply({ embeds: [embed] });
}
