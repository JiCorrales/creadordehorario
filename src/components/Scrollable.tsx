import React, { useEffect, useRef } from 'react';
import { useOverlayScrollbars } from 'overlayscrollbars-react';
import 'overlayscrollbars/overlayscrollbars.css';

interface ScrollableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  options?: any;
}

const Scrollable: React.FC<ScrollableProps> = ({ children, className, options, ...props }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [initialize] = useOverlayScrollbars({
    options: {
      scrollbars: {
        theme: 'os-theme-custom',
        autoHide: 'scroll',
        clickScroll: true,
        ...options?.scrollbars,
      },
      ...options,
    },
    defer: true,
  });

  useEffect(() => {
    if (ref.current) {
      initialize(ref.current);
    }
  }, [initialize]);

  return (
    <div ref={ref} className={className} style={{ width: '100%' }} {...props}>
      {children}
    </div>
  );
};

export default Scrollable;
