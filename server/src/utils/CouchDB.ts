import { DesignDoc } from './types';

import dotenv from 'dotenv';
dotenv.config();

export class CouchDB {
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

	static async queryView(
		viewName: string,
		params: Record<string, string> = {}
	): Promise<any[]> {
		const query = new URLSearchParams(params).toString();
		const url = `${CouchDB.dbUrl}/_design/example/_view/${viewName}?${query}`;

		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: { Authorization: CouchDB.authHeader },
			});

			if (!response.ok) {
				throw new Error(`Failed to query view: ${response.statusText}`);
			}

			const data = await response.json();
			return data.rows;
		} catch (error) {
			console.error('Error querying view:', error);
			return [];
		}
	}
}
