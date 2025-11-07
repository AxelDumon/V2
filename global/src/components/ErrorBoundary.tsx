import React from 'react';

interface ErrorBoundaryState {
	hasError: boolean;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
}

class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: any) {
		return { hasError: true };
	}

	componentDidCatch(error: any, errorInfo: any) {
		console.error('Error caught by ErrorBoundary:', error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return <div>Something went wrong.</div>;
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
