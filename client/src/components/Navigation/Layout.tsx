import React from 'react';

// Propriétés communes pour nos layouts
interface LayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: string; // Ex: "10px", "1rem"
  style?: React.CSSProperties;
  width?: string;
  className?: string;
}

// Colonne (VLayout)
export function VLayout({ children, align = 'center', justify = 'start', gap, style, width = "100%", className, ...rest }: LayoutProps) {
  return (
    <div
    className={className}
      style={{
        width: width,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        justifyContent: justify,
        gap: gap,
        flex: 1,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

// Ligne (HLayout)
export function HLayout({ children, align = 'center', justify = 'start', gap, style }: LayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: align,
        justifyContent: justify,
        gap: gap,
        ...style,
      }}
    >
      {children}
    </div>
  );
}