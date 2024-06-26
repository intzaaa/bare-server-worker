import type { BareHeaders, BareRemote } from './requestUtil';

export interface MetaV1 {
	v: 1;
	response?: {
		headers: BareHeaders;
	};
}

export interface MetaV2 {
	v: 2;
	response?: { status: number; statusText: string; headers: BareHeaders };
	sendHeaders: BareHeaders;
	remote: BareRemote;
	forwardHeaders: string[];
}

export interface MetaV3 {
	v: 3;
	response?: { status: number; statusText: string; headers: BareHeaders };
	sendHeaders: BareHeaders;
	remote: BareRemote;
	forwardHeaders: string[];
}

export default interface CommonMeta {
	value: MetaV1 | MetaV2 | MetaV3; // Updated to include MetaV3
	expires: number;
}

export interface Database {
	get(key: string): string | undefined | PromiseLike<string | undefined>;
	set(key: string, value: string): unknown;
	has(key: string): boolean | PromiseLike<boolean>;
	delete(key: string): boolean | PromiseLike<boolean>;
	entries():
		| IterableIterator<[string, string]>
		| AsyncIterableIterator<[string, string]>
		| PromiseLike<IterableIterator<[string, string]>>
		| PromiseLike<AsyncIterableIterator<[string, string]>>;
}

/**
 * @internal
 */
export class JSONDatabaseAdapter {
	impl: Database;
	constructor(impl: Database) {
		this.impl = impl;
	}
	async get(key: string) {
		const res = await this.impl.get(key);
		if (typeof res === 'string') return JSON.parse(res) as CommonMeta;
	}
	async set(key: string, value: CommonMeta) {
		return await this.impl.set(key, JSON.stringify(value));
	}
	async has(key: string) {
		return await this.impl.has(key);
	}
	async delete(key: string) {
		return await this.impl.delete(key);
	}
	async *[Symbol.asyncIterator]() {
		for await (const [id, value] of await this.impl.entries()) {
			yield [id, JSON.parse(value)] as [string, CommonMeta];
		}
	}
}

/**
 * Routine
 */
export async function cleanupDatabase(database: Database) {
	const adapter = new JSONDatabaseAdapter(database);

	for await (const [id, { expires }] of adapter)
		if (expires < Date.now()) database.delete(id);
}
