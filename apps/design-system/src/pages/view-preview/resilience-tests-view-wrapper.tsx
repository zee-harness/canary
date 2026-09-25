import { FC, PropsWithChildren } from 'react'

import { Breadcrumb, HarnessLogo, IconV2, Sidebar, Text, useSidebar } from '@harnessio/ui/components'

import { AppViewWrapper, AppViewWrapperProps } from './app-view-wrapper'

type ResilienceNav = 'overview' | 'insights' | 'chaos-experiments' | 'usage'

const OVERVIEW_ROUTE = '/view-preview/resilience-tests/overview'
const CHAOS_ROUTE = '/view-preview/resilience-tests/chaos-experiments'

const ResilienceTestsSidebar = ({
  activeNav,
  chaosLeafActive = false
}: {
  activeNav: ResilienceNav
  /** True when on a page nested under Chaos Experiments (e.g. an execution), so the
      Chaos Experiments crumb stays selected even though the child route doesn't match. */
  chaosLeafActive?: boolean
}) => {
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  return (
  <Sidebar.Root>
    {/* Zero the header's bottom padding so the logo sits tight to the pinned group,
        matching the design (only the group's own top padding separates them). */}
    <Sidebar.Header style={{ paddingBottom: 0 }}>
      <div className={`flex w-full items-center ${collapsed ? 'justify-center' : 'gap-cn-sm'}`}>
        <div className={collapsed ? 'flex items-center' : 'pl-cn-xs flex items-center'}>
          <HarnessLogo size={26} />
        </div>
        {!collapsed && (
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <Text variant="body-single-line-strong" truncate>
                Project Name
              </Text>
              <Text variant="caption-single-line-normal" color="foreground-3" truncate>
                Project
              </Text>
            </div>
            <IconV2 name="nav-arrow-right" size="xs" className="text-cn-3" />
          </>
        )}
      </div>
    </Sidebar.Header>
    <Sidebar.Content>
      <Sidebar.Group>
        <Sidebar.Item icon="view-grid" title="Home" />
        <Sidebar.Item icon="menu-more-horizontal" title="More" withRightIndicator />
      </Sidebar.Group>

      <Sidebar.Separator />

      <Sidebar.Group label="Recent">
        <Sidebar.Item icon="chaos-tests" title="Resilience Tests" defaultSubmenuOpen>
          <Sidebar.MenuSubItem to={OVERVIEW_ROUTE} end active={activeNav === 'overview'} title="Overview" />
          <Sidebar.MenuSubItem
            to="/view-preview/resilience-tests/insights"
            end
            active={activeNav === 'insights'}
            title="Insights"
          />
          <Sidebar.MenuSubItem
            to={CHAOS_ROUTE}
            end
            active={activeNav === 'chaos-experiments'}
            // On a nested page (e.g. an execution) the child route won't match this link,
            // so force the selected style to keep Chaos Experiments highlighted.
            className={chaosLeafActive ? 'active' : undefined}
            title="Chaos Experiments"
          />
          <Sidebar.MenuSubItem to="/view-preview/resilience-tests/load-tests" title="Load Tests" />
          <Sidebar.MenuSubItem to="/view-preview/resilience-tests/dr-tests" title="DR Testing" />
          <Sidebar.MenuSubItem to="/view-preview/resilience-tests/usage" title="Resilience Test Usage" />
          <Sidebar.MenuSubItem to="/view-preview/resilience-tests/settings" title="Settings" />
        </Sidebar.Item>
      </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer>
      {/* Avatar name is spaced ("Bradley Rydzewski") so initials resolve to "BR",
          while the visible label keeps the hyphenated username. */}
      <Sidebar.Item avatarFallback="Bradley Rydzewski" title="bradley-rydzewski" withRightIndicator />
    </Sidebar.Footer>
    <Sidebar.Rail />
  </Sidebar.Root>
  )
}

export interface ResilienceTestsViewWrapperProps extends Omit<AppViewWrapperProps, 'breadcrumbs' | 'sidebar'> {
  activeNav: ResilienceNav
  /** Optional leaf breadcrumb (e.g. an experiment name) shown after the module crumbs. */
  leaf?: string
}

const ResilienceTestsViewWrapper: FC<PropsWithChildren<ResilienceTestsViewWrapperProps>> = ({
  children,
  asChild,
  childrenWrapperClassName,
  activeNav,
  leaf
}) => {
  const isChaos = activeNav === 'chaos-experiments'
  const isUsage = activeNav === 'usage'
  const isInsights = activeNav === 'insights'
  const hasLeaf = Boolean(leaf)

  return (
    <AppViewWrapper
      asChild={asChild}
      childrenWrapperClassName={childrenWrapperClassName}
      insetBody
      sidebar={<ResilienceTestsSidebar activeNav={activeNav} chaosLeafActive={isChaos && hasLeaf} />}
      breadcrumbs={
        <div
          className="bg-cn-1 flex items-center"
          style={{
            height: 'var(--cn-breadcrumbs-height)',
            paddingLeft: 'var(--cn-page-container-spacing-px)',
            paddingRight: 'var(--cn-page-container-spacing-px)'
          }}
        >
          <Breadcrumb.Root className="select-none">
            <Breadcrumb.List>
              <Breadcrumb.Item>
                {isChaos || isUsage || isInsights ? (
                  <Breadcrumb.Link href="#">{isInsights ? 'Resilience Tests' : 'Resilience Testing'}</Breadcrumb.Link>
                ) : (
                  <Breadcrumb.Page>Resilience Testing</Breadcrumb.Page>
                )}
              </Breadcrumb.Item>
              {isInsights && (
                <>
                  <Breadcrumb.Separator />
                  <Breadcrumb.Item>
                    <Breadcrumb.Page>Insights</Breadcrumb.Page>
                  </Breadcrumb.Item>
                </>
              )}
              {isUsage && (
                <>
                  <Breadcrumb.Separator />
                  <Breadcrumb.Item>
                    <Breadcrumb.Page>Resilience Test Usage</Breadcrumb.Page>
                  </Breadcrumb.Item>
                </>
              )}
              {isChaos && (
                <>
                  <Breadcrumb.Separator />
                  <Breadcrumb.Item>
                    {hasLeaf ? (
                      <Breadcrumb.Link href="#">Chaos Experiments</Breadcrumb.Link>
                    ) : (
                      <Breadcrumb.Page>Chaos Experiments</Breadcrumb.Page>
                    )}
                  </Breadcrumb.Item>
                </>
              )}
              {hasLeaf && (
                <>
                  <Breadcrumb.Separator />
                  <Breadcrumb.Item>
                    <Breadcrumb.Page>{leaf}</Breadcrumb.Page>
                  </Breadcrumb.Item>
                </>
              )}
            </Breadcrumb.List>
          </Breadcrumb.Root>
        </div>
      }
    >
      {children}
    </AppViewWrapper>
  )
}

export default ResilienceTestsViewWrapper
