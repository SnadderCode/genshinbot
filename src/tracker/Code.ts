import type {Reward} from "./Reward";

export class Code {
	private readonly _code: string;
	private readonly _rewards: Reward[];

	constructor(code: string, rewards: Reward[] = []) {
		this._code = code;
		this._rewards = [...rewards];
	}

	getCode(): string {
		return this._code;
	}

	getRewards(): Reward[] {
		return [...this._rewards];
	}

	addReward(reward: Reward): void {
		this._rewards.push(reward);
	}

	removeReward(reward: Reward): void {
		const index = this._rewards.indexOf(reward);
		if (index !== -1) this._rewards.splice(index, 1);
	}
}
