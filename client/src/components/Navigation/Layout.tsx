import React from 'react';

// Propriétés communes pour nos layouts
interface LayoutProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: string; // Ex: "10px", "1rem"
  style?: React.CSSProperties;
}

// Colonne (VLayout)
export function VLayout({ children, align = 'center', justify = 'start', gap, style }: LayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align,
        justifyContent: justify,
        gap: gap,
        flex: 1, // Pour que ça prenne toute la place dispo par défaut (comme tes fillHeight)
        ...style,
      }}
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