# Levels migration note (2026-09-23)

## Contract id map (bestiary merge, max of kills/completions/mastery; unlocked OR)

| Old id | New id |
|---|---|
| cave_rats | bristle_cub |
| tunnel_bats | thornpelt_bear |
| drain_leeches | dire_thornpelt |
| bog_slimes | ashfang_pup |
| mist_wolves | ashfang_wolf |
| thorn_sprites | dire_ashfang |
| grave_beetles | silkling |
| bone_rattlers | webfen_widow |

- `brood_matron` is new (no old C for crypt).
- `ash_imps` / `cinder_hounds` (L4) left under old keys; Level 4 chrome hidden.
- `currentContractId` remapped via the table above.

## Mat id map (counts summed into new id; old key deleted)

| Old | New |
|---|---|
| grip_scrap | pelt_scrap |
| wail_shard | dire_claw |
| ember_core | ashfang_fang |

Forge recipes retargeted to new ids. Legacy mat catalog entries remain as aliases for safety.

## Prey / boss

- Prey ids kept: `sewer_king` → Elder Thornpelt, `mist_wraith` → Ashfang Alpha, `crypt_lord` → Nightweave.
- `chip` / `threshold` → `meter` / `bossCost` (120 / 280 / 600).
- If legacy chip was full enough to Claim, migrate grants `accessUnlocked` (Fight boss) — no progress wipe.
- Finished bosses stay finished.

## Blocked / ambiguous

None that would wipe progress. `ember_core → ashfang_fang` is a forward map (L1 mage mat → L2 signature) chosen to preserve inventory counts without inventing a destructive wipe.
