# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [2.0.1] - 2017-06-01
### Fixed
- Service action type, service category, department filtering now works on services page from @myrcutio
- Departments filter now works on event calendar from @myrcutio
- Services now appear on departments page from @myrcutio
- Events now can filter again by department from @mredding10

## [2.0.0] - 2017-06-01
### Changed
- Removed any form of authentication against the API (CCTX-249) from @mredding10
- Major updates to site performance from @myrcutio & @erikrahm

### Fixed
- Fixed an issue with the elongated blue content block on promo pages (CCTX-239) from @erikrahm
- Ensured that titles with HTML characters in the homepage events block display as non HTML entities (CCTX-213) from @mredding10

## [1.5.4] - 2017-03-21
### Fixed
- Fixed regression in upcoming events module on the homepage from @erikrahm

## [1.5.3] - 2017-03-21
### Added
- Allow YouTube videos to not show related videos (CCTX-232) from @erikrahm

### Changed
- Changed the events page logic to allow for better filtering, and to show past events (CCTX-175, CCTX-235, CCTX-217) from @erikrahm
- Increased number of departments showing on All Departments (CCTX-229) from @ecirish

### Fixed
- Fixed contact form to be more accessible (CCTX-191) from @ecirish

## [1.5.2] - 2017-02-16
### Added
- Logging around dates to understand better crash handling from @colinphanna

### Changed
- Adjusted some margin space in the kiosk (CCTX-233) from @ecirish

### Fixed
- Removed bullet styles from appearing in places where they shouldn't (CCTX-228) from @ecirish

## [1.5.1] - 2017-02-02
### Changed
- Added a specific callout in the global menu for BrowseAloud (CCTX-126) from @ecirish
- Cleaned up the flex content area clearfixes (CCTX-212) from @ecirish
- Adjusted disc styles from WYSWIYG content areas (CCTX-222) from @ecirish

### Fixed
- Fixed a typo in the contact form (CCTX-221) from @ecirish

## [1.5.0] - 2017-01-18
### Added
- BrowseAloud scripts in footer (CCTX-126) from @mredding10

### Changed
- Kiosk display logic (CCTX-214) from @ecirish, @mredding10
- Default header image swap (CCTX-216) from @ecirish
- Swap out the career block on the homepage (CCTX-215) from @ecirish

### Fixed
- Don't show past events in homepage (CCTX-175) from @ecirish, @mredding10

## [1.4.1] - 2016-10-25
### Changed
- Pagination updates for consistency (CCTX-152) from @mredding10
- Mobile style on video blocks now make logical sense (CCTX-115) from @mredding10
- Flex content areas have different anchor positions & headline styles (CCTX-158) from @mredding10

### Fixed
- Match height on video blocks to ensure seamless edge (CCTX-159) from @mredding10

## [1.4.0] - 2016-10-20
### Changed
- Updated visual style to remove circled arrows and simplify visual style (CCTX-146) from @mredding10
- Photo content area images should be aligned to top (CCTX-176) from @mredding10

### Fixed
- Change the 'Submit' text on events to resolve FF issue (CCTX-136) from @mredding10

## [1.3.0] - 2016-10-19
### Changed
- Breadcrumb styles now are more usable (CCTX-147) from @mredding10
- CircleCI integration & automatic deployment (CCTX-187) from @suitupalex
- More homepage mobile enhancements from @mredding10
- Swap out the homepage hero image (CCTX-180) from @mredding10
- Bring navigation hover menu directly underneath main item for usability (CCTX-148) from @mredding10

### Added
- Add favicons (CCTX-163) from @mredding10
- Added "View All" links on homepage I Want To.. block (CCTX-164) from @mredding10

### Fixed
- Additional Links on detailed info pages are back, now with better conditional logic (CCTX-130) from @mredding10
- Featured CTA makes its return to its proper place on the homepage (CCTX-166) from @mredding10
- Additional Links on service pages are also back, with the same better conditional logic (CCTX-110) from @mredding10
- Accessibility issue on video blocks if background image fails to load (CCTX-183) from @mredding10

## [1.2.0] - 2016-10-14
### Changed
- Padding on menu items for accessibility (CCTX-140) from @mredding10
- Revamped how header logo is built (CCTX-162) from @mredding10
- Rebuilt responsive mobile menu (CCTX-161) from @mredding10
- Add aria-labels to social media icon links for AA compliance (CCTX-143) from @mredding10
- Accessible contact form updates (CCTX-142) from @mredding10
- Accessibility style fixes (CCTX-139) from @mredding10

## [1.1.2] - 2016-10-05
### Fixed
- Regression introduced on homepage video where video doesn't load by default from @mredding10

## [1.1.1] - 2016-10-05
### Added
- Users can now use youtu.be short links to share videos (CCTX-133) from @mredding10
- GTM code is now included on every page (CCTX-153) from @mredding10

### Changed
- Remove description from events on the homepage (CCTX-149) from @mredding10
- Increased font size in the utility nav to reflect accessibility concerns (CCTX-141) from @mredding10
- Removed the "I Want To" blocks from the contact form & related style adjustments for all breakpoints (CCTX-155) from @mredding10

## [1.1.0] - 2016-10-04
### Added
- Ability to handle 301 redirects (CCTX-80) from @mredding10

## [1.0.0] - 2016-09-29
Initial release to end users.

### Fixed
- Resolved issue where NaN was showing up on events calendar (CCTX-101) from @suitupalex
- Resolved issue where line spaces from the CMS were being rendered as paragraphs (CCTX-96) from @suitupalex
- Resolved homepage "I Want To" block spacing on tab click (CCTX-84) from @suitupalex
- Resolved tweet block not showing latest tweet in some cases (CCTX-129) from @suitupalex


## [0.2.4] - 2016-09-27
### Changed
- Homepage hero image has changed (CCTX-125) from @mredding10
- "I want to" link headers don't need underlines from @mredding10
- Footer style now relies on the CMS to pull in paragraph style (CCTX-105) from @mredding10
- Added a list style type for blocks (CCTX-108) from @suitupalex
- Search box is now hidden on mobile devices from @suitupalex
- Service descriptions on department pages now cut off at 200 characters (CCTX-104) from @suitupalex
- Contact form now has a default "Select" option (CCTX-97) from @suitupalex
- Anchor links now default to underline (CCTX-93) from @suitupalex, @mredding10

### Fixed
- Search results page now is headlined 'Search Results' (CCTX-129) from @mredding10
- Changed service category to trim on the CMS side of things (reverting CCTX-104) to fix CCTX-90 from @mredding10
- Event filters now properly handle events with no meeting type (CCTX-89) from @mredding10
- Contact form now has spaces after the end of the paragraph (CCTX-103) from @suitupalex
- Timezones are calculated by the CMS, not the front-end now (CCTX-99) from @suitupalex, @mredding10
- Menu items respect the weight given to them in the CMS (CCTX-98) from @suitupalex
- Services are directly linked to on the department page (CCTX-93) from @suitupalex
- Resolved issue where Event Type was displaying ID not name (CCTX-86) from @suitupalex

### Added
- Placeholder search results page from @suitupalex
- Add an API route for investigative purposes from @suitupalex

## [0.2.3] - 2016-09-14
### Fixed
- Make sure meta is on every page from @mredding10

## [0.2.2] - 2016-09-14
### Changed
- Swap out the default background image for the departments page from @mredding10

#TODO: Backfill the change log.
