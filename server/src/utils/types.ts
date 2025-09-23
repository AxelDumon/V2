export type DesignDoc = {
	_id: string; // The ID of the design document (e.g., "_design/example")
	_rev?: string; // Optional revision ID for updates
	views: {
		[viewName: string]: {
			map: string; // The map function as a string
			reduce?: string; // Optional reduce function as a string
		};
	};
	language?: string; // Optional language (default is "javascript")
	options?: {
		partitioned?: boolean; // Optional partitioning option
	};
};
