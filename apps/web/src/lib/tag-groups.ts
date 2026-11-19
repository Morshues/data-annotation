export type GroupedTags<G, T> = {
  // null for the tags that are not in any group
  group: G | null
  tags: T[]
}

// Groups tags under their tag group, in the order the groups are given, with
// the ungrouped tags last. Tags keep their order within each group. Empty
// groups are left out unless includeEmpty is set; the ungrouped section is
// always left out when empty.
export function groupTags<
  G extends { id: number },
  T extends { groupId: number | null },
>(tags: T[], groups: G[], includeEmpty = false): GroupedTags<G, T>[] {
  const sections: GroupedTags<G, T>[] = groups.map((group) => ({
    group,
    tags: tags.filter((t) => t.groupId === group.id),
  }))
  const known = new Set(groups.map((g) => g.id))
  sections.push({
    group: null,
    tags: tags.filter((t) => t.groupId === null || !known.has(t.groupId)),
  })
  return sections.filter(
    (s) => s.tags.length > 0 || (includeEmpty && s.group !== null),
  )
}
