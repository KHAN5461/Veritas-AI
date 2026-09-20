'use client';
import { useState, useRef, MouseEvent, useEffect } from 'react';

/* ========== M3 RIPPLE HOOK ========== */
export const useRipple = () => {
  const [ripples, setRipples] = useState<{ x: number, y: number, id: number }[]>([]);

  const addRipple = (e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    setRipples(prev => [...prev, { x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2, id: Date.now() }]);
  };

  useEffect(() => {
    if (ripples.length > 0) {
      const timeout = setTimeout(() => setRipples(prev => prev.slice(1)), 600);
      return () => clearTimeout(timeout);
    }
  }, [ripples]);

  const RippleElements = ripples.map(r => (
    <span
      key={r.id}
      className="absolute bg-on-surface rounded-full animate-ripple pointer-events-none"
      style={{ left: r.x, top: r.y, width: '100%', paddingBottom: '100%' }}
    />
  ));

  return { addRipple, RippleElements };
};

/* ========== M3 BUTTON ========== */
export const Button = ({ children, className, onClick, variant = 'filled', type }: any) => {
  const { addRipple, RippleElements } = useRipple();
  const base = "relative overflow-hidden inline-flex items-center justify-center gap-2 h-10 px-6 rounded-full font-medium text-sm transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ";
  const variants: Record<string, string> = {
    filled: "bg-primary text-on-primary hover:shadow-[var(--md-sys-elevation-1)] active:scale-[0.98]",
    tonal: "bg-secondary-container text-on-secondary-container hover:shadow-[var(--md-sys-elevation-1)]",
    outlined: "border border-outline text-primary hover:bg-primary/8",
    text: "text-primary hover:bg-primary/8",
  };
  return (
    <button type={type} onClick={(e) => { addRipple(e); onClick && onClick(e); }} className={base + (variants[variant] || variants.filled) + " " + (className || "")}>
      {RippleElements}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};

/* ========== M3 ICON BUTTON ========== */
export const IconButton = ({ icon, onClick, className }: any) => {
  const { addRipple, RippleElements } = useRipple();
  return (
    <button onClick={(e) => { addRipple(e); onClick && onClick(e); }} className={"relative overflow-hidden w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/8 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface " + (className || "")}>
      {RippleElements}
      <span className="material-symbols-outlined text-[24px] relative z-10">{icon}</span>
    </button>
  );
};

/* ========== M3 CARD ========== */
export const Card = ({ children, className, onClick, variant = 'elevated' }: any) => {
  const { addRipple, RippleElements } = useRipple();
  const Tag = onClick ? 'button' : 'div';
  
  const variants: Record<string, string> = {
    elevated: "bg-surface-container-low shadow-[var(--md-sys-elevation-1)] hover:shadow-[var(--md-sys-elevation-2)]",
    filled: "bg-surface-container-highest hover:shadow-[var(--md-sys-elevation-1)]",
    outlined: "bg-surface border border-outline-variant hover:shadow-[var(--md-sys-elevation-1)]"
  };

  return (
    <Tag 
      onClick={(e: any) => { if (onClick) { addRipple(e); onClick(e); } }} 
      className={"rounded-xl p-4 transition-all duration-200 relative overflow-hidden outline-none text-left w-full " + 
        (variants[variant] || variants.elevated) + " " +
        (onClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface " : "") + 
        (className || "")}
    >
      {onClick && RippleElements}
      {children}
    </Tag>
  );
};

/* ========== M3 CHIP ========== */
export const Chip = ({ label, icon, variant = 'assist', className, onClick, selected }: any) => {
  const { addRipple, RippleElements } = useRipple();
  const Tag = onClick ? 'button' : 'div';
  
  const isSelected = selected || variant === 'filter';
  
  const variants: Record<string, string> = {
    assist: "border border-outline text-on-surface hover:bg-on-surface/8",
    filter: isSelected ? "bg-secondary-container text-on-secondary-container hover:bg-on-secondary-container/8" : "border border-outline text-on-surface-variant hover:bg-on-surface-variant/8",
    suggestion: "border border-outline text-on-surface-variant hover:bg-on-surface-variant/8",
    input: "border border-outline text-on-surface-variant hover:bg-on-surface-variant/8"
  };

  return (
    <Tag
      onClick={(e: any) => { if (onClick) { addRipple(e); onClick(e); } }}
      className={"relative overflow-hidden inline-flex items-center gap-2 h-8 rounded-lg text-sm font-medium transition-colors outline-none " + 
        (icon ? "pl-2 pr-4 " : "px-4 ") +
        (onClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface " : "") + 
        (variants[variant] || variants.assist) + " " + (className || "")}
    >
      {onClick && RippleElements}
      {icon && <span className={"material-symbols-outlined text-[18px] " + (variant === 'assist' && !selected ? 'text-primary' : '')}>{icon}</span>}
      <span className="relative z-10 truncate">{label}</span>
    </Tag>
  );
};

/* ========== M3 SWITCH ========== */
export const Switch = ({ checked, onChange, label }: any) => (
  <label className="inline-flex items-center gap-3 cursor-pointer select-none">
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      onClick={() => onChange && onChange(!checked)}
      className={"relative w-[52px] h-[32px] rounded-full transition-colors duration-200 " + (checked ? "bg-primary" : "bg-surface-container-highest border-2 border-outline")}
    >
      <span className={"absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow transition-all duration-200 " + (checked ? "left-[24px] bg-on-primary" : "left-[4px] bg-outline")} />
    </button>
    {label && <span className="text-sm text-on-surface">{label}</span>}
  </label>
);

/* ========== M3 SKELETON ========== */
export const Skeleton = ({ className }: any) => <div className={"animate-pulse bg-surface-container-highest rounded-xl " + (className || "")} />;

/* ========== M3 CIRCULAR PROGRESS ========== */
export const CircularProgress = ({ value }: { value?: number }) => {
  if (value !== undefined) {
    const radius = 18;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (value / 100) * circumference;
    return (
      <div className="relative inline-flex items-center justify-center w-10 h-10">
        <svg className="transform -rotate-90 w-10 h-10">
          <circle cx="20" cy="20" r={radius} className="stroke-secondary-container fill-none" strokeWidth="4" />
          <circle cx="20" cy="20" r={radius} className="stroke-primary fill-none transition-all duration-300 ease-out" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} />
        </svg>
      </div>
    );
  }
  return (
    <div className="relative inline-flex items-center justify-center w-10 h-10">
      <div className="w-10 h-10 rounded-full border-4 border-secondary-container absolute" />
      <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent border-r-transparent animate-spin absolute" />
    </div>
  );
};

/* ========== M3 LINEAR PROGRESS ========== */
export const LinearProgress = ({ value }: { value?: number }) => (
  <div className="w-full h-1 bg-secondary-container overflow-hidden relative">
    {value !== undefined ? (
      <div className="h-full bg-primary transition-all duration-300" style={{ width: Math.min(100, Math.max(0, value)) + "%" }} />
    ) : (
      <div className="h-full w-1/3 bg-primary animate-[indeterminate_1.5s_ease-in-out_infinite]" />
    )}
  </div>
);

/* ========== M3 RADIAL GAUGE ========== */
export const RadialGauge = ({ value, isError, size = 120, strokeWidth = 8 }: any) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className="stroke-surface-container-highest fill-none" strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className={"fill-none transition-all duration-1000 ease-out " + (isError ? "stroke-error" : "stroke-primary")}
          strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={"text-3xl font-bold tracking-tight " + (isError ? 'text-error' : 'text-primary')}>
          {value.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

/* ========== M3 STAT WIDGET ========== */
export const StatWidget = ({ title, value, label, isError, icon }: any) => {
  // Mock trend data based on title for demonstration
  const trendVal = title.includes("Scans") ? "+12%" : title.includes("Found") ? "+4%" : title.includes("Latency") ? "-0.1s" : "Stable";
  const trendIsGood = title.includes("Latency") || title === "Total Scans" || trendVal === "Stable";

  return (
    <div className="flex flex-col justify-between h-full relative overflow-hidden">
      <div className="flex justify-between items-start mb-4 z-10">
        <div className={"w-10 h-10 rounded-full flex items-center justify-center " + (isError ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary-container")}>
          {icon && <span className="material-symbols-outlined text-[20px]">{icon}</span>}
        </div>
        <div className={"px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide flex items-center gap-1 " + (trendIsGood ? "bg-surface-container-highest text-primary" : "bg-error-container/50 text-error")}>
          {trendVal !== "Stable" && <span className="material-symbols-outlined text-[12px]">{trendIsGood ? (title.includes("Latency") ? "trending_down" : "trending_up") : "trending_up"}</span>}
          {trendVal}
        </div>
      </div>
      
      <div className="flex flex-col z-10">
        <h4 className="text-sm font-medium text-on-surface-variant mb-1">{title}</h4>
        <span className={"text-3xl font-bold tracking-tight " + (isError ? 'text-error' : 'text-on-surface')}>{value}</span>
        {label && <span className="text-xs text-on-surface-variant mt-1">{label}</span>}
      </div>
    </div>
  );
};

/* ========== M3 FORENSIC CARD ========== */
export const ForensicCard = ({ title, score, verdict, children }: any) => {
  const isBad = score > 0.5;
  return (
    <Card variant="elevated" className="flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={"w-10 h-10 rounded-full flex items-center justify-center shrink-0 " + (isBad ? "bg-error-container text-on-error-container" : "bg-primary-container text-on-primary-container")}>
            <span className="material-symbols-outlined">{isBad ? "warning" : "verified_user"}</span>
          </div>
          <h3 className="font-medium text-on-surface truncate" title={title}>{title}</h3>
        </div>
      </div>
      
      <div className="flex items-baseline gap-2 mt-1">
        <span className={"text-4xl font-bold tracking-tight " + (isBad ? 'text-error' : 'text-primary')}>
          {score > 0 ? (score * 100).toFixed(1) + '%' : '---'}
        </span>
        <span className="text-sm font-medium text-on-surface-variant">confidence</span>
      </div>

      <div className="text-sm text-on-surface-variant line-clamp-2 mt-auto">
        {children}
      </div>

      <div className="pt-3 border-t border-outline-variant/30 mt-2">
        <Chip
          label={verdict}
          variant={isBad ? 'filter' : 'assist'}
          icon={isBad ? "gpp_bad" : "gpp_good"}
          className={"!h-7 !text-xs " + (isBad ? '!bg-error !text-on-error !border-error ring-1 ring-error/20' : '')}
        />
      </div>
    </Card>
  );
};

export const ForensicCardSkeleton = () => (
  <Card className="flex flex-col gap-4">
    <div className="flex justify-between items-start">
      <Skeleton className="w-1/2 h-6" />
      <Skeleton className="w-20 h-8 !rounded-full" />
    </div>
    <Skeleton className="w-24 h-10" />
    <div className="flex flex-col gap-2">
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-2/3 h-4" />
    </div>
  </Card>
);

/* ========== M3 BANNER ========== */
export const Banner = ({ icon, title, children, actionLabel, onAction, isError }: any) => (
  <div className={"w-full p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 " + (isError ? "bg-error-container text-on-error-container" : "bg-secondary-container text-on-secondary-container")}>
    <div className="flex items-start gap-4">
      {icon && <span className={"material-symbols-outlined mt-1 " + (isError ? "text-error" : "text-secondary")}>{icon}</span>}
      <div>
        <h4 className="font-semibold text-sm mb-1">{title}</h4>
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
    {actionLabel && (
      <Button variant={isError ? "filled" : "tonal"} onClick={onAction} className={isError ? "!bg-error !text-on-error shrink-0" : "shrink-0"}>
        {actionLabel}
      </Button>
    )}
  </div>
);

/* ========== M3 DROPZONE (with working file browse) ========== */
export const Dropzone = ({ onFileDrop, title, subtitle, multiple }: any) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    if (onFileDrop) {
      if (multiple) {
        Array.from(files).forEach(f => onFileDrop(f));
      } else {
        onFileDrop(files[0]);
      }
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
      }}
      onClick={() => fileInputRef.current?.click()}
      className={"border-2 border-dashed rounded-3xl h-[280px] flex flex-col items-center justify-center transition-all duration-200 cursor-pointer " + (isDragging ? 'border-primary bg-primary/8 scale-[1.01]' : 'border-outline-variant hover:border-primary/50 bg-surface-container-low')}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple={multiple}
        accept="image/*,video/*,audio/*"
        onChange={(e) => { if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files); }}
      />
      <div className={"w-14 h-14 rounded-2xl flex items-center justify-center mb-4 " + (isDragging ? "bg-primary/16" : "bg-surface-container-high")}>
        <span className={"material-symbols-outlined text-[28px] " + (isDragging ? "text-primary" : "text-on-surface-variant")}>upload_file</span>
      </div>
      <h3 className="text-lg font-medium text-on-surface mb-1">{title || "Drag and drop evidence"}</h3>
      <p className="text-sm text-on-surface-variant">{subtitle || "Supports MP4, AVI, WAV, JPG, PNG"}</p>
    </div>
  );
};