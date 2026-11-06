export class Reward {
	constructor(
		private readonly _item: string,
		private readonly _quantity: number,
	) {}

	getItem(): string {
		return this._item;
	}

	getQuantity(): number {
		return this._quantity;
	}
}
