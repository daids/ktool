"use client";

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import webhid from '../lib/webhid';

export default function Home() {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectKeyboard = async () => {
    if (!webhid.isSupported()) {
      setError('WebHID is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // First try to auto-connect to existing paired devices
      const existingDevices = await webhid.getDevices();
      if (existingDevices.length > 0) {
        // Try to connect to the first available device
        try {
          await webhid.open(existingDevices[0]);
          // Store connection state in localStorage
          localStorage.setItem('keyboardConnected', 'true');
          localStorage.setItem('deviceInfo', JSON.stringify({
            productName: existingDevices[0].productName,
            vendorId: existingDevices[0].vendorId
          }));

          // Navigate to dashboard
          router.push('/dashboard');
          return;
        } catch (autoConnectErr) {
          console.log('Auto-connect failed, falling back to device picker', autoConnectErr);
          // Fall through to device picker if auto-connect fails
        }
      }

      // Fall back to device picker if no existing devices or auto-connect failed
      const device = await webhid.requestAndOpen();
      if (device) {
        // Store connection state in localStorage
        localStorage.setItem('keyboardConnected', 'true');
        localStorage.setItem('deviceInfo', JSON.stringify({
          productName: device.productName,
          vendorId: device.vendorId
        }));

        // Navigate to dashboard
        router.push('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to keyboard. Please try again.');
    } finally {
      setIsConnecting(false);
    }
  };

  const enterDemoMode = async () => {
    setIsConnecting(true);
    try {
      const device = await webhid.enableDemoMode();
      // Store connection state in localStorage
      localStorage.setItem('keyboardConnected', 'true');
      localStorage.setItem('deviceInfo', JSON.stringify({
        productName: device.productName,
        vendorId: device.vendorId
      }));
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Failed to enter demo mode.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            KTool
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            A powerful keyboard configuration and mapping tool
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={connectKeyboard}
            disabled={isConnecting}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            {isConnecting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Loading...</span>
              </>
            ) : (
              <span>Connect Keyboard</span>
            )}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">or</span>
            <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
          </div>

          <button
            onClick={enterDemoMode}
            disabled={isConnecting}
            className="w-full py-3 px-6 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-lg transition-colors duration-200"
          >
            Try Demo Mode
          </button>

          <div className="text-center pt-2">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Works best in Chrome or Edge browsers
            </p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            How to Connect:
          </h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>Click "Connect Keyboard" button</li>
            <li>Select your keyboard from the browser dialog</li>
            <li>Grant permission when prompted</li>
            <li>Start configuring your keyboard!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
