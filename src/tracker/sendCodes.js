const {buildCodeMessage} = require("./codeMessageBuilder");

async function sendCodesToDiscord(codes, channel) {
	for (const [code, rewards] of codes.entries()) {
		const message = await buildCodeMessage(code, rewards);
		await channel.send(message);
	}
}

module.exports = {
	sendCodesToDiscord,
};
