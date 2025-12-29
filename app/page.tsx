'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to process file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.name.replace('.json', '')}_extracted.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Cursor tracker */}
      <div
        className="fixed w-16 h-16 bg-blue-500 rounded-full opacity-10 pointer-events-none z-50 transition-all duration-300 ease-out blur-sm"
        style={{
          left: mousePosition.x - 16,
          top: mousePosition.y - 16,
        }}
      />
      
      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-100 rounded-full opacity-20 blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-100 rounded-full opacity-20 blur-3xl" />
      
      <main className="relative flex min-h-screen w-full flex-col items-center justify-center py-32 px-16">
        <div className="flex flex-col items-center gap-8 text-center max-w-4xl">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
              HyperVerge Workflow Extractor
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl leading-relaxed">
              Transform your JSON workflow files into structured CSV data. Extract modules, conditions, and SDK responses with precision and ease.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full max-w-md">
            <div className="relative group">
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-4 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-gradient-to-r file:from-blue-50 file:to-indigo-50 file:text-blue-700 hover:file:from-blue-100 hover:file:to-indigo-100 transition-all duration-200 shadow-lg hover:shadow-xl file:transition-all file:duration-200"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-10 transition-opacity duration-200 pointer-events-none" />
            </div>
            
            <button
              type="submit"
              disabled={!file || loading}
              className="h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:hover:scale-100"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                'Extract and Download'
              )}
            </button>
          </form>

          {error && (
            <div className="w-full max-w-md p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl">
            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Module Extraction</h3>
              <p className="text-gray-600 text-sm">Automatically identify and extract workflow modules with all their properties.</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Condition Analysis</h3>
              <p className="text-gray-600 text-sm">Parse complex conditions and flatten nested configurations into readable CSV format.</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-gray-200/50">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">SDK Response Mapping</h3>
              <p className="text-gray-600 text-sm">Extract and humanize SDK response keys for better understanding and analysis.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
