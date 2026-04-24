import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { useNavigation } from '../routes/NavigationContext'

interface RouterLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string
}

export function RouterLink({ to, onClick, ...props }: RouterLinkProps) {
  const { navigate } = useNavigation()

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)

    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey
    ) {
      return
    }

    event.preventDefault()
    navigate(to)
  }

  return <a href={to} onClick={handleClick} {...props} />
}
