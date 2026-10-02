import React, { useRef, useState, useEffect } from 'react';
import { ShieldCheck, Copy, Check, Sparkles, KeyRound } from 'lucide-react';

interface CodeInput16DigitProps {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export const CodeInput16Digit: React.FC<CodeInput16DigitProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false,
  error = false,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(16).fill(''));
  const [useSingleInput, setUseSingleInput] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const clean = value.replace(/\D/g, '').slice(0, 16);
    const newDigits = Array(16).fill('');
    for (let i = 0; i < clean.length; i++) {
      newDigits[i] = clean[i];
    }
    setDigits(newDigits);
  }, [value]);

  const updateFullCode = (newDigits: string[]) => {
    const fullCode = newDigits.join('');
    onChange(fullCode);
    if (fullCode.length === 16 && onComplete) {
      onComplete(fullCode);
    }
  };

  const handleChange = (index: number, char: string) => {
    if (disabled) return;
    const cleanDigit = char.replace(/\D/g, '');
    if (!cleanDigit && char !== '') return;

    const newDigits = [...digits];
    newDigits[index] = cleanDigit.slice(-1);
    setDigits(newDigits);
    updateFullCode(newDigits);

    if (cleanDigit && index < 15) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        updateFullCode(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
        updateFullCode(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 15) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text');
    const numericData = pastedData.replace(/\D/g, '').slice(0, 16);

    if (numericData.length > 0) {
      const newDigits = Array(16).fill('');
      for (let i = 0; i < numericData.length; i++) {
        newDigits[i] = numericData[i];
      }
      setDigits(newDigits);
      updateFullCode(newDigits);

      const focusIndex = Math.min(numericData.length, 15);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleSingleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = e.target.value.replace(/\D/g, '').slice(0, 16);
    onChange(clean);
    if (clean.length === 16 && onComplete) {
      onComplete(clean);
    }
  };

  const handleCopyFormatted = () => {
    const formatted = digits.join('').replace(/(\d{4})/g, '$1 ').trim();
    if (formatted) {
      navigator.clipboard.writeText(formatted);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Header controls */}
      <div className="flex items-center justify-between text-xs font-medium text-slate-600 px-1">
        <div className="flex items-center gap-1.5 text-indigo-600 font-semibold">
          <KeyRound className="w-4 h-4" />
          <span>16-Digit Verification Code</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopyFormatted}
            className="hover:text-indigo-600 transition-colors flex items-center gap-1 text-slate-500"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            type="button"
            onClick={() => setUseSingleInput(!useSingleInput)}
            className="text-slate-500 hover:text-indigo-600 transition-colors underline underline-offset-2"
          >
            {useSingleInput ? 'Switch to Grouped Mode' : 'Switch to Single Input'}
          </button>
        </div>
      </div>

      {/* 16-Digit Input Display */}
      {!useSingleInput ? (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2 sm:gap-3" onPaste={handlePaste}>
            {[0, 1, 2, 3].map((groupIndex) => (
              <div
                key={groupIndex}
                className="flex items-center justify-between gap-1 p-1.5 rounded-xl bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-inner"
              >
                {[0, 1, 2, 3].map((cellIndex) => {
                  const absoluteIndex = groupIndex * 4 + cellIndex;
                  const isFilled = Boolean(digits[absoluteIndex]);

                  return (
                    <input
                      key={absoluteIndex}
                      ref={(el) => {
                        inputRefs.current[absoluteIndex] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digits[absoluteIndex] || ''}
                      disabled={disabled}
                      onChange={(e) => handleChange(absoluteIndex, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(absoluteIndex, e)}
                      className={`w-6 h-9 sm:w-8 sm:h-11 text-center font-mono text-base sm:text-lg font-bold rounded-lg transition-all outline-none ${
                        isFilled
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-300 shadow-sm'
                          : 'bg-white text-slate-800 border border-slate-200'
                      } ${
                        error ? 'border-rose-500 text-rose-600 bg-rose-50' : ''
                      } focus:bg-indigo-50 focus:border-indigo-600 focus:text-indigo-900 focus:scale-105`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono px-1">
            <span>Group 1</span>
            <span>Group 2</span>
            <span>Group 3</span>
            <span>Group 4</span>
          </div>
        </div>
      ) : (
        /* Single Input Mode */
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={19}
            value={value.replace(/(\d{4})/g, '$1 ').trim()}
            onChange={handleSingleInputChange}
            disabled={disabled}
            placeholder="4829 1730 5614 8273"
            className={`w-full px-4 py-3.5 bg-slate-50 font-mono text-xl text-center tracking-[0.25em] font-bold text-indigo-700 rounded-xl border ${
              error ? 'border-rose-500 ring-2 ring-rose-100' : 'border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100'
            } outline-none shadow-inner placeholder:text-slate-400 transition-all`}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 pt-1">
        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>
            Code Length: <strong className="text-indigo-600">{value.replace(/\D/g, '').length}</strong> / 16
          </span>
        </div>
        {value.replace(/\D/g, '').length === 16 && (
          <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
            <Check className="w-3.5 h-3.5" /> Ready for Verification
          </span>
        )}
      </div>
    </div>
  );
};
