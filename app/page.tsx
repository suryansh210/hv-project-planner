'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import WaterRipples from '@/app/components/WaterRipples';

interface ExtractedData {
  modules: any[];
  conditions: any[];
  sdk: { keyName: string; keyMeaning: string }[];
  headers: {
    modules: string[];
    conditions: string[];
    sdk: string[];
  };
  stats: {
    totalModules: number;
    totalConditions: number;
    totalSdkKeys: number;
    moduleTypes: string[];
    conditionKeys: string[];
  };
}

interface DataTableProps {
  data: any[];
  columns: ColumnDef<any>[];
  title: string;
}

function DataTable({ data, columns, title }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="mt-4">
          <input
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(String(event.target.value))}
            placeholder="Search all columns..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    {{
                      asc: ' 🔼',
                      desc: ' 🔽',
                    }[header.column.getIsSorted() as string] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </button>
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </button>
        </div>
        <span className="text-sm text-gray-700">
          Page {table.getState().pagination.pageIndex + 1} of{' '}
          {table.getPageCount()}
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExtractedData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState<'preview' | 'visualization'>('preview');

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setError(null);
    setData(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json']
    },
    multiple: true
  });

  const processFiles = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      // For now, process only the first file
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to process file');
      }

      const result: ExtractedData = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (format: 'csv' | 'json' | 'excel' | 'pdf', type: 'modules' | 'conditions' | 'sdk' | 'all') => {
    if (!data) return;

    const timestamp = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      if (type === 'all') {
        // Export all as ZIP (original functionality)
        const formData = new FormData();
        formData.append('file', files[0]);
        const response = await fetch('/api/extract', { method: 'POST', body: formData });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${files[0].name.replace('.json', '')}_extracted.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const csvData = type === 'modules' ? data.modules : type === 'conditions' ? data.conditions : data.sdk;
        const headers = data.headers[type];
        const csv = [headers.join(','), ...csvData.map(row =>
          headers.map(h => JSON.stringify(row[h] || '')).join(',')
        )].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_${timestamp}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } else if (format === 'json') {
      const jsonData = type === 'all' ? data : { [type]: data[type] };
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${timestamp}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else if (format === 'excel') {
      const wb = XLSX.utils.book_new();

      if (type === 'all') {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.modules), 'Modules');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.conditions), 'Conditions');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.sdk), 'SDK');
      } else {
        const sheetData = type === 'modules' ? data.modules : type === 'conditions' ? data.conditions : data.sdk;
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetData), type.charAt(0).toUpperCase() + type.slice(1));
      }

      XLSX.writeFile(wb, `${type}_${timestamp}.xlsx`);
    } else if (format === 'pdf') {
      const pdf = new jsPDF();
      pdf.text(`${type.toUpperCase()} Report - ${timestamp}`, 20, 20);

      if (type === 'all') {
        pdf.text(`Total Modules: ${data.stats.totalModules}`, 20, 40);
        pdf.text(`Total Conditions: ${data.stats.totalConditions}`, 20, 50);
        pdf.text(`Total SDK Keys: ${data.stats.totalSdkKeys}`, 20, 60);
      } else {
        const count = type === 'modules' ? data.stats.totalModules : type === 'conditions' ? data.stats.totalConditions : data.stats.totalSdkKeys;
        pdf.text(`Total ${type}: ${count}`, 20, 40);
      }

      pdf.save(`${type}_report_${timestamp}.pdf`);
    }
  };

  const modulesColumns = useMemo<ColumnDef<any>[]>(() =>
    data?.headers.modules.map(header => ({
      accessorKey: header,
      header: header.charAt(0).toUpperCase() + header.slice(1),
    })) || [], [data]
  );

  const conditionsColumns = useMemo<ColumnDef<any>[]>(() =>
    data?.headers.conditions.map(header => ({
      accessorKey: header,
      header: header.charAt(0).toUpperCase() + header.slice(1),
    })) || [], [data]
  );

  const sdkColumns = useMemo<ColumnDef<any>[]>(() =>
    data?.headers.sdk.map(header => ({
      accessorKey: header,
      header: header.charAt(0).toUpperCase() + header.slice(1),
    })) || [], [data]
  );

  const chartData = useMemo(() => {
    if (!data) return [];
    const typeCount: { [key: string]: number } = {};
    data.modules.forEach(module => {
      typeCount[module.type] = (typeCount[module.type] || 0) + 1;
    });
    return Object.entries(typeCount).map(([type, count]) => ({ type, count }));
  }, [data]);

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Cursor tracker */}
      <div
        className="fixed w-8 h-8 bg-blue-500 rounded-full opacity-10 pointer-events-none z-50 transition-all duration-300 ease-out blur-sm"
        style={{
          left: mousePosition.x - 16,
          top: mousePosition.y - 16,
        }}
      />

      {/* Background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-blue-100 rounded-full opacity-20 blur-3xl" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-indigo-100 rounded-full opacity-20 blur-3xl" />
      <WaterRipples/>

      <main className="relative max-w-7xl mx-auto py-8 px-6">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-4">
            HyperVerge Project Planner
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Advanced workflow analysis with interactive data preview, visualization, and multiple export options.
          </p>
        </div>

        {/* Upload Section */}
        <div className="mb-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop the JSON files here...' : 'Drag & drop JSON files here, or click to select'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Support for multiple files • JSON format only
                </p>
              </div>
            </div>
          </div>

          {files.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Selected Files:</h4>
              <ul className="space-y-1">
                {files.map((file, index) => (
                  <li key={index} className="text-sm text-blue-700">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </li>
                ))}
              </ul>
              <button
                onClick={processFiles}
                disabled={loading}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Processing...' : 'Process Files'}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {data && (
          <div className="space-y-8">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Modules</p>
                    <p className="text-2xl font-bold text-gray-900">{data.stats.totalModules}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Conditions</p>
                    <p className="text-2xl font-bold text-gray-900">{data.stats.totalConditions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">SDK Keys</p>
                    <p className="text-2xl font-bold text-gray-900">{data.stats.totalSdkKeys}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Types</p>
                    <p className="text-2xl font-bold text-gray-900">{data.stats.moduleTypes.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="flex">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'preview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Data Preview
                  </button>
                  <button
                    onClick={() => setActiveTab('visualization')}
                    className={`px-6 py-4 text-sm font-medium border-b-2 ${
                      activeTab === 'visualization'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Visualization
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'preview' && (
                  <div className="space-y-8">
                    {/* Export Options */}
                    <div className="flex flex-wrap gap-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => exportData('csv', 'all')}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                          Export All CSV
                        </button>
                        <button
                          onClick={() => exportData('json', 'all')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          Export JSON
                        </button>
                        <button
                          onClick={() => exportData('excel', 'all')}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                        >
                          Export Excel
                        </button>
                        <button
                          onClick={() => exportData('pdf', 'all')}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                          Export PDF
                        </button>
                      </div>
                    </div>

                    {/* Tables */}
                    <div className="space-y-8">
                      <DataTable
                        data={data.modules}
                        columns={modulesColumns}
                        title="Modules"
                      />
                      <DataTable
                        data={data.conditions}
                        columns={conditionsColumns}
                        title="Conditions"
                      />
                      <DataTable
                        data={data.sdk}
                        columns={sdkColumns}
                        title="SDK Response"
                      />
                    </div>
                  </div>
                )}

                {activeTab === 'visualization' && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Module Types Pie Chart */}
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Types Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bar Chart */}
                      <div className="bg-white p-6 rounded-lg border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Module Counts by Type</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="type" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">{data.stats.totalModules}</p>
                          <p className="text-sm text-gray-600">Total Modules</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">{data.stats.totalConditions}</p>
                          <p className="text-sm text-gray-600">Total Conditions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">{data.stats.totalSdkKeys}</p>
                          <p className="text-sm text-gray-600">SDK Keys</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-indigo-600">{data.stats.moduleTypes.length}</p>
                          <p className="text-sm text-gray-600">Module Types</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
