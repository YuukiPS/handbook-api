import { CommandInteraction, SlashCommandBuilder } from "discord.js"

const cmd = new SlashCommandBuilder().setName("ping").setDescription("Replies with Pong!")
async function run(interaction: CommandInteraction) {
	const sent = await interaction.reply({ content: "Pinging...", fetchReply: true })
	const ping = sent.createdTimestamp - interaction.createdTimestamp
	await interaction.editReply(`Pong! Latency is ${ping}ms. API Latency is ${interaction.client.ws.ping}ms.`)
}

let _
export default _ = {
	process: run,
	command: cmd
}
