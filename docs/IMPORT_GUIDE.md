# Import Guide

Registry is prepared for a real cutover import without adding sample business records. The current import preparation covers four blank CSV layouts:

- `registry-customers.csv`
- `registry-units.csv`
- `registry-active-rentals.csv`
- `registry-opening-balances.csv`

Download blank header files from the Registry app at `/imports`.

## Import Order

1. Customers
2. Container units
3. Active rentals
4. Opening balances

Customers and units must be imported before active rentals because rentals reference `customer_code` and `unit_code`. Opening balances should come last so ledger entries can link to the imported customer, rental, and unit records.

## Required Keys

- `customer_code`: stable customer key from Total Recall or office records
- `unit_code`: stable unit/container code
- `rental_code`: stable active-rental key
- `entry_code`: stable ledger row key for opening balances

These keys make the import repeatable and auditable before cutover.

## Current Status

The import screen can dry-run uploaded CSV files, report validation and cross-reference errors, show row counts, execute the import, write an import batch audit trail, and roll back records created by that batch. The field mapping should still be checked against a real Total Recall export before cutover.
