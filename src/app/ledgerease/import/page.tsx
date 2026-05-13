'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileSpreadsheet, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CsvImportPreview, { type ImportItem } from '@/components/ledgerease/CsvImportPreview';

export default function ImportCsvPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [items, setItems] = useState<ImportItem[] | null>(null);

  const processFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('請上傳 .csv 格式的檔案');
      return;
    }
    setLoading(true);
    setError('');
    setWarning('');

    const fd = new FormData();
    fd.append('file', file);

    try {
      const res = await fetch('/api/ledgerease/import-csv', {
        method: 'POST',
        body: fd,
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? '解析失敗，請確認 CSV 格式');
        return;
      }

      setItems(json.items as ImportItem[]);
      if (json.warning) setWarning(json.warning as string);
    } catch {
      setError('上傳失敗，請重試');
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = ''; // allow re-selecting same file
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleReset = () => {
    setItems(null);
    setWarning('');
    setError('');
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild className="h-9 w-9">
          <Link href="/ledgerease">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">匯入載具 CSV</h1>
          <p className="text-muted-foreground text-sm">財政部手機載具明細 → LedgerEase</p>
        </div>
      </div>

      {/* Upload area (only shown before results) */}
      {!items && !loading && (
        <>
          <Card
            className={`border-2 border-dashed transition-colors cursor-pointer mb-4 ${
              dragging
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20'
                : 'border-border hover:border-violet-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
          >
            <CardContent className="py-14 flex flex-col items-center gap-3 select-none">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-950">
                <FileSpreadsheet className="h-7 w-7 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground mb-1">
                  {dragging ? '放開以上傳 📂' : '點擊或拖曳 CSV 檔案至此'}
                </p>
                <p className="text-sm text-muted-foreground">支援財政部手機載具明細 CSV 格式</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-1 pointer-events-none"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                選擇檔案
              </Button>
            </CardContent>
          </Card>

          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />

          {/* How-to guide */}
          <div className="rounded-xl bg-muted/50 border p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">📱 如何匯出載具 CSV？</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>開啟「財政部電子發票」App 或 載具發票查詢網站</li>
              <li>進入「載具發票」→「消費發票查詢」</li>
              <li>選擇查詢期間</li>
              <li>點選「下載 / 匯出」→ 選擇 <strong>含品項明細</strong> 的 CSV</li>
            </ol>
          </div>
        </>
      )}

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="py-14 flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
            <p className="font-medium text-foreground">AI 正在自動分類品項…</p>
            <p className="text-sm text-muted-foreground">請稍候，這通常需要幾秒鐘</p>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive mb-4">
          {error}
        </div>
      )}

      {/* AI fallback warning */}
      {warning && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 mb-4 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300">
          ⚠️ {warning}
        </div>
      )}

      {/* Preview table */}
      {items && (
        <CsvImportPreview items={items} onReset={handleReset} />
      )}
    </div>
  );
}
