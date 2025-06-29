'use client';

type PageHeaderProps = {
  title: string;
};

export default function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-center justify-center">
      <h1 className="text-3xl font-semibold text-black">{title}</h1>

      <div className=" w-full border-b border-gray-300" />
    </div>
  );
}
