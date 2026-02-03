import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorTimestamp: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
      errorTimestamp: new Date()
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorTimestamp } = this.state;
    const { children } = this.props;

    if (hasError) {
      return (
        <div className='flex min-h-screen flex-col bg-gray-100'>
          <main className='flex flex-grow flex-col items-center justify-center p-4 md:p-6'>
            <div className='w-full max-w-lg rounded-lg bg-white p-6 text-center shadow-md md:p-8'>
              <div className='mb-4 flex flex-col items-center justify-center text-red-600'>
                <h1 className='text-2xl font-semibold'>Application Error</h1>
              </div>

              <p className='text-md mb-6 text-gray-700'>
                An unexpected error occurred. Please try refreshing the page, which often resolves temporary issues.
              </p>

              <div className='mt-6 border-t border-gray-200 pt-6 text-left'>
                {error && (
                  <div className='mt-4 rounded-lg bg-red-50 p-4'>
                    <details className='text-sm'>
                      <summary className='cursor-pointer font-medium text-red-800 hover:text-red-900'>
                        Technical Error Details (For Gibas Support)
                      </summary>
                      {errorTimestamp && (
                        <p className='mt-2 text-xs text-gray-500'>
                          Error Occurred At: {errorTimestamp.toLocaleString()}
                        </p>
                      )}
                      <pre className='mt-2 overflow-auto whitespace-pre-wrap break-words rounded bg-red-100 p-3 text-xs text-red-700 shadow-inner'>
                        {error.stack || error.toString()}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      );
    }

    return children;
  }
}
