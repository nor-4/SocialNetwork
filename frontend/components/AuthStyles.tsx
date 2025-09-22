"use client";

import React from "react";
import { Switch } from "@headlessui/react";

// Input Field
export const AuthInput = ({
  label,
  id,
  type = "text",
  value,
  onChange,
  required = false,
  ...props
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  [key: string]: any;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-[#522c77]">
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      required={required}
      className="mt-1 block w-full rounded-md border border-[#e7dbf9] shadow-sm focus:border-[#8b4ecf] focus:ring-[#8b4ecf] sm:text-sm px-3 text-[#4c3c63]"
      {...props}
    />
  </div>
);

// Select Field
export const AuthSelect = ({
  label,
  id,
  value,
  onChange,
  options,
  required = false,
  ...props
}: {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  [key: string]: any;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-[#522c77]">
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      className="mt-1 block w-full rounded-md border border-[#e7dbf9] shadow-sm focus:border-[#8b4ecf] focus:ring-[#8b4ecf] sm:text-sm px-3 text-[#4c3c63]"
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

// Textarea Field
export const AuthTextarea = ({
  label,
  id,
  value,
  onChange,
  rows = 2,
  required = false,
  ...props
}: {
  label: string;
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  required?: boolean;
  [key: string]: any;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-[#522c77]">
      {label}
    </label>
    <textarea
      id={id}
      value={value}
      onChange={onChange}
      rows={rows}
      required={required}
      className="mt-1 block w-full rounded-md border border-[#e7dbf9] shadow-sm focus:border-[#8b4ecf] focus:ring-[#8b4ecf] sm:text-sm"
      {...props}
    />
  </div>
);

// Button
export const AuthButton = ({
  children,
  type = "button",
  onClick,
  className,
  ...props
}: {
  children: React.ReactNode;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  className?: string;
  [key: string]: any;
}) => (
  <button
    type={type}
    onClick={onClick}
    className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8b4ecf] hover:bg-[#763cb4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8b4ecf] ${
      className || ""
    }`}
    {...props}
  >
    {children}
  </button>
);

// Toggle
export const AuthToggle = ({
  checked,
  onChange,
  label,
  ...props
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  [key: string]: any;
}) => (
  <div className="flex items-center">
    <Switch
      checked={checked}
      onChange={onChange}
      className={`${
        checked ? "bg-[#8b4ecf]" : "bg-[#e7dbf9]"
      } relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#8b4ecf] focus:ring-offset-2`}
      {...props}
    >
      <span
        className={`${
          checked ? "translate-x-5" : "translate-x-1"
        } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
      />
    </Switch>
    <span className="ml-2 text-sm text-[#522c77]">{label}</span>
  </div>
);

// Container
export const AuthContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#faf6fe] flex flex-col justify-center py-8 px-4">
    {children}
  </div>
);

// Card
export const AuthCard = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-6 mx-auto w-full max-w-sm">
    <div className="bg-white py-6 px-4 shadow rounded-lg">{children}</div>
  </div>
);

// Header
export const AuthHeader = ({
  title,
  subtitle,
  link,
  linkText,
}: {
  title: string;
  subtitle?: string;
  link?: string;
  linkText?: string;
}) => (
  <div className="mx-auto w-full max-w-sm">
    <h2 className="text-center text-2xl font-bold text-[#351556]">{title}</h2>
    {subtitle && (
      <div className="mt-2 text-center">
        {link ? (
          <a
            href={link}
            className="text-sm font-medium text-[#8b4ecf] hover:text-[#763cb4]"
          >
            {linkText || subtitle}
          </a>
        ) : (
          <p className="text-sm text-[#522c77]">{subtitle}</p>
        )}
      </div>
    )}
  </div>
);
