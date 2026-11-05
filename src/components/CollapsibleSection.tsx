"use client";
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
}

// 折叠区:标题行 + 可展开内容,用于收纳次要工具模块,保持主页面清爽
export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  icon,
  defaultCollapsed = true,
  children,
}) => {
  const [open, setOpen] = useState(!defaultCollapsed);

  return (
    <section className="bg-white dark:bg-zinc-900 border border-subtle rounded-2xl shadow-card dark:shadow-card-dark overflow-hidden transition-colors duration-200">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-white/4 transition-colors select-none cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {icon}
          <span className="text-sm font-bold text-zinc-900 dark:text-white whitespace-nowrap">{title}</span>
          {subtitle && (
            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 truncate hidden sm:inline">
              {subtitle}
            </span>
          )}
        </div>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 ml-2"
        >
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-subtle pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
