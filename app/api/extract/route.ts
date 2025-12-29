import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { stringify } from 'csv-stringify/sync';
import archiver from 'archiver';

const MODULE_FIELDS = [
  "type",
  "subType",
  "id",
  "nextStep",
  "name",
  "version",
  "stepId"
];

// ---------- UTILITIES ----------
function flatten(val: any): string {
  if (typeof val === 'object' && val !== null) {
    return JSON.stringify(val);
  }
  return String(val);
}

function humanizeKey(key: string): string {
  key = key.replace(/([a-z])([A-Z])/g, '$1 $2');
  key = key.replace(/_/g, ' ');
  return key.charAt(0).toUpperCase() + key.slice(1);
}

// ---------- MODULE EXTRACTION ----------
function extractModules(obj: any, modules: any[]): void {
  if (typeof obj === 'object' && obj !== null) {
    if (
      typeof obj.id === 'string' &&
      obj.id.startsWith('module_') &&
      typeof obj.type === 'string' &&
      'name' in obj &&
      'stepId' in obj
    ) {
      modules.push({
        type: obj.type || '',
        subType: obj.subType || '',
        id: obj.id || '',
        nextStep: obj.nextStep || '',
        name: obj.name || '',
        version: obj.version || '',
        stepId: obj.stepId || ''
      });
    }

    for (const v of Object.values(obj)) {
      extractModules(v, modules);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      extractModules(item, modules);
    }
  }
}

// ---------- CONDITIONS EXTRACTION ----------
function extractConditions(conditionsBlock: any): { rows: any[], headers: string[] } {
  const rows: any[] = [];
  const headers = new Set<string>();

  for (const [conditionId, conditionObj] of Object.entries(conditionsBlock)) {
    if (!conditionId.startsWith('condition_')) continue;

    const row: any = { conditionId };

    for (const [key, value] of Object.entries(conditionObj as any)) {
      if ((key === 'ifTrueConfigs' || key === 'ifFalseConfigs') && typeof value === 'object' && value !== null) {
        for (const [nestedKey, nestedValue] of Object.entries(value as any)) {
          const columnName = `${key}_${nestedKey}`;
          row[columnName] = flatten(nestedValue);
          headers.add(columnName);
        }
      } else {
        row[key] = flatten(value);
        headers.add(key);
      }
    }

    rows.push(row);
  }

  return { rows, headers: Array.from(headers) };
}

// ---------- SDK RESPONSE EXTRACTION ----------
function collectSdkKeys(obj: any, collected: Map<string, string>): void {
  if (typeof obj === 'object' && obj !== null) {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === 'object' && v !== null) {
        collectSdkKeys(v, collected);
      } else {
        collected.set(k, humanizeKey(k));
      }
    }
  }
}

// ---------- CSV GENERATION ----------
function generateCsv(rows: any[], headers: string[]): string {
  if (!rows.length) return '';
  return stringify(rows, { header: true, columns: headers });
}

function generateSdkCsv(sdkMap: Map<string, string>): string {
  if (!sdkMap.size) return '';
  const rows = Array.from(sdkMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, meaning]) => ({ keyName: key, keyMeaning: meaning }));
  return stringify(rows, { header: true });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const data = JSON.parse(Buffer.from(buffer).toString('utf-8'));

    const workflowName = path.parse(file.name || 'workflow').name;

    // -------- MODULES --------
    const modules: any[] = [];
    extractModules(data, modules);

    // -------- CONDITIONS --------
    let conditions: any[] = [];
    let conditionHeaders: string[] = [];
    if (data.conditions) {
      const { rows, headers } = extractConditions(data.conditions);
      conditions = rows;
      conditionHeaders = headers;
    }

    // -------- SDK RESPONSE --------
    const sdkMap = new Map<string, string>();
    if (data.sdkResponse) {
      collectSdkKeys(data.sdkResponse, sdkMap);
    } else if (data.sdkResponses) {
      collectSdkKeys(data.sdkResponses, sdkMap);
    }

    // -------- GENERATE CSVs --------
    const modulesCsv = generateCsv(modules, MODULE_FIELDS);
    const conditionsCsv = generateCsv(conditions, conditionHeaders);
    const sdkCsv = generateSdkCsv(sdkMap);

    // -------- RETURN DATA FOR PREVIEW --------
    return NextResponse.json({
      modules: modules,
      conditions: conditions,
      sdk: Array.from(sdkMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, meaning]) => ({ keyName: key, keyMeaning: meaning })),
      headers: {
        modules: MODULE_FIELDS,
        conditions: Array.from(conditionHeaders),
        sdk: ['keyName', 'keyMeaning']
      },
      stats: {
        totalModules: modules.length,
        totalConditions: conditions.length,
        totalSdkKeys: sdkMap.size,
        moduleTypes: [...new Set(modules.map(m => m.type))],
        conditionKeys: Array.from(conditionHeaders)
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}