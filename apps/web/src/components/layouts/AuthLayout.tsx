import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export function AuthLayout({ children }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
