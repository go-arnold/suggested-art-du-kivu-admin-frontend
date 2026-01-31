"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Type as type, LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  trend?: "up" | "down" | "neutral"
  className?: string
}

export function StatCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend = "neutral",
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-card p-6 card-shadow transition-smooth hover:card-shadow-elevated group",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/5 transition-transform group-hover:scale-110" />
      
      <div className="relative">
        {/* Icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-smooth group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-6 w-6" />
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-muted-foreground">{title}</p>

        {/* Value */}
        <p className="mt-1 font-mono text-3xl font-bold tracking-tight text-foreground">
          {value}
        </p>

        {/* Change indicator */}
        {change !== undefined && (
          <div className="mt-3 flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trend === "up" && "bg-success/10 text-success",
                trend === "down" && "bg-destructive/10 text-destructive",
                trend === "neutral" && "bg-muted text-muted-foreground"
              )}
            >
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
              <span>{change > 0 ? "+" : ""}{change}%</span>
            </div>
            {changeLabel && (
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
