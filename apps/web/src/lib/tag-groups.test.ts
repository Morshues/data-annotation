import { describe, expect, it } from 'vitest'
import { groupTags } from './tag-groups'

const groups = [
  { id: 1, name: '詞性' },
  { id: 2, name: '時態' },
]

const tags = [
  { id: 10, groupId: 1, name: '主詞' },
  { id: 11, groupId: null, name: '其他' },
  { id: 12, groupId: 1, name: '受詞' },
]

describe('groupTags', () => {
  it('groups tags in group order with ungrouped tags last', () => {
    expect(groupTags(tags, groups)).toEqual([
      { group: groups[0], tags: [tags[0], tags[2]] },
      { group: null, tags: [tags[1]] },
    ])
  })

  it('keeps empty groups when asked', () => {
    expect(
      groupTags(tags, groups, true).map((s) => s.group?.id ?? null),
    ).toEqual([1, 2, null])
  })

  it('leaves out an empty ungrouped section', () => {
    expect(groupTags([tags[0]], groups, true).map((s) => s.group)).toEqual(
      groups,
    )
  })

  it('treats tags of an unknown group as ungrouped', () => {
    const stray = { id: 13, groupId: 99, name: '孤兒' }
    expect(groupTags([stray], groups)).toEqual([{ group: null, tags: [stray] }])
  })
})
