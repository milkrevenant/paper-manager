"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import {
  Panel,
  Group as PanelGroup,
  Separator as PanelResizeHandle,
  type PanelImperativeHandle,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof PanelGroup>) {
  return (
    <PanelGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const ResizablePanel = React.forwardRef<
  PanelImperativeHandle,
  React.ComponentProps<typeof Panel>
>((props, ref) => {
  return <Panel panelRef={ref} data-slot="resizable-panel" {...props} />
})
ResizablePanel.displayName = "ResizablePanel"

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof PanelResizeHandle> & {
  withHandle?: boolean
}) {
  return (
    <PanelResizeHandle
      data-slot="resizable-handle"
      className={cn(
        "relative flex w-[2px] items-center justify-center bg-transparent hover:bg-[#d97757]/30 active:bg-[#d97757]/50 transition-colors duration-100 cursor-col-resize",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2",
        "data-[panel-group-direction=vertical]:h-[2px] data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:cursor-row-resize",
        "data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-3 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:translate-x-0 data-[panel-group-direction=vertical]:after:-translate-y-1/2",
        "[&[data-panel-group-direction=vertical]>div]:rotate-90",
        "focus-visible:outline-hidden",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-stone-100 z-10 flex h-4 w-3 items-center justify-center rounded-xs border border-stone-200">
          <GripVerticalIcon className="size-2.5 text-stone-400" />
        </div>
      )}
    </PanelResizeHandle>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle, type PanelImperativeHandle }
