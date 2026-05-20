import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureException } from '../../lib/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info);
    captureException(error, { componentStack: info.componentStack });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <div className="glass rounded-2xl p-8 max-w-md text-center space-y-4">
          <h1 className="font-display text-2xl text-rihla-text">Something went wrong</h1>
          <p className="text-rihla-muted text-sm">
            We hit an unexpected error. The team has been notified — try refreshing or starting a new journey.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                this.reset();
                window.location.assign('/');
              }}
              className="bg-rihla-gold/90 hover:bg-rihla-gold text-rihla-primary font-medium rounded-lg px-4 py-2 text-sm transition"
            >
              Go home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-white/10 hover:bg-white/15 text-rihla-text rounded-lg px-4 py-2 text-sm transition"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
