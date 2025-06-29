'use client';

import React from 'react';

type CustomButtonProps = {
  text: string;
  color?: 'blue' | 'yellow' | 'red' | 'green';
  size?: 'small' | 'medium' | 'large';
  width?: string;
  height?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
};

export default function CustomButton({
  text,
  color = 'blue',
  size = 'medium',
  width = 'w-auto',
  height = 'h-auto',
  onClick,
  type = 'button',
  disabled = false,
}: CustomButtonProps) {
  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    yellow: 'bg-yellow-400 hover:bg-yellow-500',
    red: 'bg-red-500 hover:bg-red-600',
    green: 'bg-green-500 hover:bg-green-600',
  };

  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-md',
    large: 'px-8 py-4 text-2xl',
  };

  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center font-bold text-white rounded-full shadow-md transition ${colorClasses[color]} ${sizeClasses[size]} ${width} ${height} ${disabledClasses}`}
    >
      {text}
    </button>
  );
}