import { NetworkDebug } from '../components/NetworkDebug';
import { DebugLogs } from '../components/DebugLogs';
import { DebugPanel } from '../components/DebugPanel';
import { ErrorPanel } from '../components/ErrorDisplay';

export const DebugPage = () => {
  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">🔍 Debug Network Connection</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <NetworkDebug />
        </div>

        <div className="md:col-span-2">
          <DebugPanel />
        </div>

        <div className="md:col-span-2">
          <DebugLogs />
        </div>

        <div className="md:col-span-2">
          <ErrorPanel />
        </div>
      </div>
    </div>
  );
};
