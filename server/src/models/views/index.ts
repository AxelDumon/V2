// Upload all design documents on startup
// (async () => {
// 	for (const [name, designDoc] of Object.entries(designDocs)) {
// 		console.log(`Uploading design document: ${name}`);
// 		await CouchDB.uploadDesignDoc(designDoc);
// 	}
// })();
export type DesignDocs = Record<string, DesignDoc>;
import fs from 'fs';
import path from 'path';
import { DesignDoc } from '../../utils/types';

const designDocs: DesignDocs = {};

// Path to the design_docs folder
const designDocsPath = path.join(__dirname, 'design_docs');

// Read all files in the design_docs folder
fs.readdirSync(designDocsPath).forEach(file => {
	if (file.endsWith('.json')) {
		const docName = path.basename(file, '.json'); // Use the file name (without extension) as the key
		const docPath = path.join(designDocsPath, file);
		designDocs[docName] = require(docPath); // Dynamically require the JSON file
	}
});

export default designDocs;
