import { useEffect, useRef, useCallback } from 'react'

interface UseKeyboardNavigationOptions {
  enabled?: boolean
  trapFocus?: boolean
  restoreFocus?: boolean
  initialFocus?: string // CSS selector
}

export const useKeyboardNavigation = (options: UseKeyboardNavigationOptions = {}) => {
  const { enabled = true, trapFocus = false, restoreFocus = false, initialFocus } = options

  const containerRef = useRef<HTMLElement>(null)
  const previousActiveElement = useRef<Element | null>(null)

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return []

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')

    return Array.from(containerRef.current.querySelectorAll(focusableSelectors)) as HTMLElement[]
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled || !containerRef.current) return

      const focusableElements = getFocusableElements()
      if (focusableElements.length === 0) return

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement)

      switch (event.key) {
        case 'Tab':
          if (trapFocus) {
            event.preventDefault()
            const nextIndex = event.shiftKey
              ? (currentIndex - 1 + focusableElements.length) % focusableElements.length
              : (currentIndex + 1) % focusableElements.length
            focusableElements[nextIndex]?.focus()
          }
          break

        case 'ArrowDown':
        case 'ArrowRight':
          event.preventDefault()
          const nextDownIndex = (currentIndex + 1) % focusableElements.length
          focusableElements[nextDownIndex]?.focus()
          break

        case 'ArrowUp':
        case 'ArrowLeft':
          event.preventDefault()
          const nextUpIndex =
            (currentIndex - 1 + focusableElements.length) % focusableElements.length
          focusableElements[nextUpIndex]?.focus()
          break

        case 'Home':
          event.preventDefault()
          focusableElements[0]?.focus()
          break

        case 'End':
          event.preventDefault()
          focusableElements[focusableElements.length - 1]?.focus()
          break

        case 'Escape':
          if (trapFocus && restoreFocus && previousActiveElement.current) {
            ;(previousActiveElement.current as HTMLElement).focus()
          }
          break
      }
    },
    [enabled, trapFocus, restoreFocus, getFocusableElements]
  )

  // Set initial focus
  const setInitialFocus = useCallback(() => {
    if (!enabled || !containerRef.current) return

    let elementToFocus: HTMLElement | null = null

    if (initialFocus) {
      elementToFocus = containerRef.current.querySelector(initialFocus)
    }

    if (!elementToFocus) {
      const focusableElements = getFocusableElements()
      elementToFocus = focusableElements[0] || null
    }

    if (elementToFocus) {
      elementToFocus.focus()
    }
  }, [enabled, initialFocus, getFocusableElements])

  // Store previous active element for focus restoration
  useEffect(() => {
    if (enabled && restoreFocus) {
      previousActiveElement.current = document.activeElement
    }
  }, [enabled, restoreFocus])

  // Set up keyboard event listeners
  useEffect(() => {
    if (!enabled) return

    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown)

    // Set initial focus when component mounts
    const timeoutId = setTimeout(setInitialFocus, 0)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      clearTimeout(timeoutId)
    }
  }, [enabled, handleKeyDown, setInitialFocus])

  return {
    containerRef,
    setInitialFocus,
    getFocusableElements
  }
}

// Hook for managing focus trap in modals
export const useFocusTrap = (isOpen: boolean) => {
  const { containerRef, setInitialFocus } = useKeyboardNavigation({
    enabled: isOpen,
    trapFocus: true,
    restoreFocus: true
  })

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
      setInitialFocus()
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, setInitialFocus])

  return containerRef
}

// Hook for managing skip links
export const useSkipLinks = () => {
  const skipToMain = useCallback(() => {
    const mainContent = document.querySelector('main, [role="main"], #main-content')
    if (mainContent) {
      ;(mainContent as HTMLElement).focus()
      ;(mainContent as HTMLElement).scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const skipToNavigation = useCallback(() => {
    const navigation = document.querySelector('nav, [role="navigation"], #navigation')
    if (navigation) {
      ;(navigation as HTMLElement).focus()
      ;(navigation as HTMLElement).scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  return {
    skipToMain,
    skipToNavigation
  }
}

// Hook for managing live regions (screen reader announcements)
export const useLiveRegion = () => {
  const liveRegionRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!liveRegionRef.current) return

    liveRegionRef.current.setAttribute('aria-live', priority)
    liveRegionRef.current.textContent = message

    // Clear the message after a short delay to allow for re-announcements
    setTimeout(() => {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = ''
      }
    }, 1000)
  }, [])

  return {
    liveRegionRef,
    announce
  }
}
