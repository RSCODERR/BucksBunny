import React, { useState, useEffect, useCallback } from 'react';
import { healthService } from '../../services/healthService';
import { HealthCheckData } from '../../types/api';
import { env } from '../../config/env';
import { StatusIndicator } from '../common/StatusIndicator';
import {
  Server,
  Database,
  Activity,
  RefreshCw,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const HealthStatusCard: React.FC = () => {
  const [data, setData] = useState<HealthCheckData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState<boolean>(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await healthService.checkHealth();
      setData(response.data);
      setLastChecked(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reach backend service.';
      setError(msg);
      setData(null);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const isDbConnected = data?.database?.isConnected ?? false;

  return (
    <div className="surface-card p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-neutral-900 border border-neutral-800 text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">
              System Service Status
            </h2>
            <p className="text-xs text-neutral-400">
              Real-time connectivity verification between client and server.
            </p>
          </div>
        </div>

        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="mt-4 p-3 rounded-md bg-rose-950/30 border border-rose-900/60 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium text-rose-200">Backend connection unavailable</p>
            <p className="text-neutral-300">{error}</p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {/* API Server */}
        <div className="surface-card-subtle p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-neutral-300" />
              API Server
            </span>
            <StatusIndicator
              status={loading ? 'loading' : data?.status === 'ok' ? 'online' : 'offline'}
              label={loading ? 'Checking' : data?.status === 'ok' ? 'Online' : 'Offline'}
            />
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium text-neutral-100">
              {loading ? 'Checking...' : data?.status === 'ok' ? 'Operational' : 'Unavailable'}
            </p>
          </div>
        </div>

        {/* Database */}
        <div className="surface-card-subtle p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-neutral-300" />
              Database
            </span>
            <StatusIndicator
              status={loading ? 'loading' : isDbConnected ? 'online' : 'offline'}
              label={loading ? 'Checking' : isDbConnected ? 'Connected' : 'Disconnected'}
            />
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium text-neutral-100">
              {loading
                ? 'Checking...'
                : isDbConnected
                ? 'Connected'
                : 'Disconnected'}
            </p>
          </div>
        </div>

        {/* Uptime */}
        <div className="surface-card-subtle p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-300" />
              Uptime
            </span>
            {lastChecked && (
              <span className="text-[10px] text-neutral-400 font-mono">
                {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>
          <div className="mt-2">
            <p className="text-sm font-medium text-neutral-100 font-mono">
              {data?.uptimeSeconds !== undefined ? `${data.uptimeSeconds}s active` : 'Unknown'}
            </p>
          </div>
        </div>
      </div>

      {/* Collapsible Technical Details */}
      <div className="mt-4 pt-3 border-t border-neutral-800">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1 transition-colors"
        >
          {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showDetails ? 'Hide' : 'Show'} connection details</span>
        </button>

        {showDetails && (
          <div className="mt-3 space-y-2">
            <div className="text-xs text-neutral-400 flex items-center gap-2">
              <span>Endpoint:</span>
              <code className="text-neutral-200 font-mono bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                {env.apiBaseUrl}/health
              </code>
            </div>
            {data && (
              <div className="p-3 rounded-md bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto">
                <pre>{JSON.stringify(data, null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
