import { DesignDoc, Document } from './types';

import dotenv from 'dotenv';
dotenv.config();

export class CouchDB {
	static async bulkDocs(
		bulkDelete: { _id: string; _rev: string | undefined; _deleted: boolean }[]
	) {
		return fetch(`${CouchDB.dbUrl}/_bulk_docs`, {
			method: 'POST',
			headers: {
				Authorization: CouchDB.authHeader,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ docs: bulkDelete }),
		})
			.then(response => {
				if (!response.ok) {
					throw new Error(
						`Failed to bulk delete documents: ${response.statusText}`
					);
				}
				return response.json();
			})
			.then(data => {
				// console.log('Bulk delete response:', data);
				return data;
			})
			.catch(error => {
				console.error('Error during bulk delete:', error);
				throw error;
			});
	}
	public static dbUrl: string = `http://127.0.0.1:5984/${process.env.DB_NAME}`;
	public static authHeader: string =
		'Basic ' +
		Buffer.from(
			`${process.env.COUCHDB_USER}:${process.env.COUCHDB_PASSWORD}`
		).toString('base64');

	static async createDatabase(): Promise<void> {
		console.log('Attempting to create database at:', CouchDB.dbUrl);
		const response = await fetch(CouchDB.dbUrl, {
			method: 'PUT',
			headers: { Authorization: CouchDB.authHeader },
		});

		if (response.ok) {
			console.log('Database created successfully.');
		} else if (response.status === 412) {
			console.log('Database already exists.');
		} else {
			const errorText = await response.text();
			console.error(
				`Failed to create database: ${response.statusText} - ${errorText}`
			);
			throw new Error(`Failed to create database: ${response.statusText}`);
		}
	}

	static async updateDocument(doc: Document): Promise<Document | null> {
		const url = `${CouchDB.dbUrl}/${doc._id}`;
		try {
			const response = await fetch(url, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: CouchDB.authHeader,
				},
				body: JSON.stringify(doc),
			});

			if (!response.ok) {
				throw new Error(`Failed to update document: ${response.statusText}`);
			}

			// console.log(`Document updated: ${doc._id}`);
			const data = await response.json();
			return { ...doc, _rev: data.rev };
		} catch (error) {
			console.error('Error updating document:', error);
			return null;
		}
	}

	static async createDocument(doc: Document): Promise<Document | null> {
		const url = `${CouchDB.dbUrl}/${doc._id}`;
		try {
			const response = await fetch(url, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: CouchDB.authHeader,
				},
				body: JSON.stringify(doc),
			});

			if (!response.ok) {
				throw new Error(`Failed to create document: ${response.statusText}`);
			}
			// console.log(`Document created: ${doc._id}`);
			const data = await response.json();
			return { ...doc, _rev: data.rev };
		} catch (error) {
			console.error('Error creating document:', error);
			return null;
		}
	}

	static async upsertDocument(doc: Document): Promise<Document | null> {
		const url = `${CouchDB.dbUrl}/${doc._id}`;
		try {
			// Check if the document already exists
			const existingDoc = await fetch(url, {
				method: 'GET',
				headers: { Authorization: CouchDB.authHeader },
			});

			if (existingDoc.ok) {
				const existingData = await existingDoc.json();
				doc._rev = existingData._rev; // Add the revision ID to update the document
			}

			// Create or update the document
			const response = await fetch(url, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: CouchDB.authHeader,
				},
				body: JSON.stringify(doc),
			});

			if (!response.ok) {
				throw new Error(`Failed to upsert document: ${response.statusText}`);
			}
			// console.log(`Document upserted: ${doc._id}`);
			const data = await response.json();
			return { ...doc, _rev: data.rev };
		} catch (error) {
			console.error('Error upserting document:', error);
			return null;
		}
	}

	// Upload a design document
	static async uploadDesignDoc(designDoc: DesignDoc): Promise<void> {
		// await CouchDB.createDatabase();

		console.log('Uploading design document:', designDoc._id);
		const url = `${CouchDB.dbUrl}/${designDoc._id}`;
		console.log('Design document URL:', url);
		try {
			// Check if the design document already exists
			const existingDoc = await fetch(url, {
				method: 'GET',
				headers: { Authorization: CouchDB.authHeader },
			});

			if (existingDoc.ok) {
				const existingData = await existingDoc.json();
				designDoc._rev = existingData._rev; // Add the revision ID to update the document
			}

			// Upload the design document
			const response = await fetch(url, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: CouchDB.authHeader,
				},
				body: JSON.stringify(designDoc),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to upload design document: ${response.statusText}`
				);
			}

			console.log(`Design document uploaded: ${designDoc._id}`);
		} catch (error) {
			console.error('Error uploading design document:', error);
		}
	}

	static async prepareQuery(
		designName: string,
		viewName: string,
		params: Record<string, string>,
		method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET'
	) {
		const query = new URLSearchParams(params).toString();
		const url = `${CouchDB.dbUrl}/_design/${designName}/_view/${viewName}?${query}`;

		// https://developer.mozilla.org/en-US/docs/Web/API/RequestInit
		const options: RequestInit = {
			method: method,
			headers: {
				Authorization: CouchDB.authHeader,
				'Content-Type': 'application/json',
			},
		};

		return { url, options };
	}

	static async callUpdateHandler(
		designName: string,
		updateName: string,
		docId: string,
		params: Record<string, string> = {},
		body: any | null = null
	) {
		// returns [doc, response : str]
		try {
			const query = new URLSearchParams(params).toString();
			const url = `${CouchDB.dbUrl}/_design/${designName}/_update/${updateName}/${docId}?${query}`;

			const options: RequestInit = {
				method: 'PUT',
				headers: {
					Authorization: CouchDB.authHeader,
					'Content-Type': 'application/json',
				},
			};

			if (body) options.body = JSON.stringify(body);
			const response = await fetch(url, options);

			if (!response.ok)
				throw new Error(
					`Failed to call update handler: ${response.statusText}`
				);
			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error calling update handler:', error);
			return null;
		}
	}

	static async updateView(
		designName: string,
		viewName: string,
		params: Record<string, string> = {},
		body: Document[] = []
	) {
		try {
			const { url, options } = await CouchDB.prepareQuery(
				designName,
				viewName,
				params,
				'PUT'
			);

			options.body = JSON.stringify(body);

			const response = await fetch(url, options);

			if (!response.ok)
				throw new Error(`Failed to update view: ${response.statusText}`);

			const data = await response.json();
			return data;
		} catch (error) {
			console.error('Error updating view:', error);
			return null;
		}
	}

	// static async findView(
	// 	designName: string,
	// 	viewName: string,
	// 	params: Record<string, string> = {},
	// 	keys?: any[]
	// ): Promise<AllDocs> {
	// 	try {
	// 		const { url, options } = await CouchDB.prepareQuery(
	// 			designName,
	// 			viewName,
	// 			params
	// 		);

	// 		if (keys) options.body = JSON.stringify({ keys });

	// 		const response = await fetch(url, options);

	// 		if (!response.ok)
	// 			throw new Error(`Failed to query view: ${response.statusText}`);

	// 		const data = await response.json();
	// 		return data.rows;
	// 	} catch (error) {
	// 		console.error('Error querying view:', error);
	// 		return {
	// 			total_rows: 0,
	// 			offset: 0,
	// 			rows: [],
	// 		};
	// 	}
	// }
	static async findView(
		designName: string,
		viewName: string,
		params: Record<string, string> = {},
		keys?: any[]
	): Promise<{ total_rows: number; rows: any[] }> {
		try {
			const query = new URLSearchParams(params).toString();
			const url = `${CouchDB.dbUrl}/_design/${designName}/_view/${viewName}?${query}`;

			const options: RequestInit = {
				method: 'GET',
				headers: {
					Authorization: CouchDB.authHeader,
				} as Record<string, string>,
			};

			if (keys) {
				options.method = 'POST';
				options.body = JSON.stringify({ keys });
				(options.headers as Record<string, string>)['Content-Type'] =
					'application/json';
			}

			const response = await fetch(url, options);

			if (!response.ok) {
				throw new Error(`Failed to query view: ${response.statusText}`);
			}

			const data = await response.json();
			return {
				total_rows: data.total_rows || 0,
				rows: data.rows || [],
			};
		} catch (error) {
			console.error(`[CouchDB.findView] Error querying view:`, error);
			return { total_rows: 0, rows: [] }; // Return a consistent structure
		}
	}
}
