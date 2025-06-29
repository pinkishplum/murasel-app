'use client';
import React from 'react';

type InputValue = string | number;

type InputBoxProps = {
  label: string;
  placeholder?: string;
  type?: string;
  fullWidth?: boolean;
  withCounter?: boolean;

  value: InputValue;
  onChange: (value: InputValue) => void;
};

export default function InputBox({
  label,
  placeholder = '',
  type = 'text',
  fullWidth = true,
  withCounter = false,
  value,
  onChange,
}: InputBoxProps) {

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' && !withCounter ? Number(e.target.value) : e.target.value;
    onChange(newValue);
  };

  const handleCounterChange = (increment: number) => {
    const currentValue = typeof value === 'number' ? value : Number(value) || 0;
    const newValue = Math.max(0, currentValue + increment); // Prevent negative numbers
    onChange(newValue);
  };


  const actualInputType = withCounter ? 'number' : type;

  return (
    <div className={`flex flex-col ${fullWidth ? 'w-full' : 'w-auto'} space-y-2`}>
      <label className="text-right font-bold text-md text-gray-700">{label}</label>

      {withCounter ? (
        <div className="flex items-center space-x-2">
           <input
             type={actualInputType}
             placeholder={placeholder}
             value={value}
             onChange={handleInputChange}
             className="flex-1 rounded-full border border-gray-300 p-4 text-center text-md [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none focus:border-blue-500"
           />
          <div className="flex items-center border border-gray-300 rounded-full overflow-hidden"> {/* Changed to rounded-full for consistency */}
            <button
              type="button"
              onClick={() => handleCounterChange(-1)}
              className="bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 text-lg font-bold transition-colors duration-200" // Improved colors and transitions
            >
              -
            </button>


            <button
              type="button"
              onClick={() => handleCounterChange(1)}
               className="bg-white hover:bg-gray-100 text-gray-700 px-4 py-2 text-lg font-bold transition-colors duration-200" // Improved colors and transitions
            >
              +
            </button>
          </div>
        </div>
      ) : (
        <input
          type={actualInputType}
          placeholder={placeholder}
          value={value}
          onChange={handleInputChange}
          className="w-full rounded-full border border-gray-300 p-4 text-right text-md focus:outline-none focus:border-blue-500"
        />
      )}
    </div>
  );
}