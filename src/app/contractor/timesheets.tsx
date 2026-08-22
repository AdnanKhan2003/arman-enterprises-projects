import { TimesheetView } from "../../components/TimesheetView";

/**
 * No tab: attendance only exists inside a project, so the Projects list (with its
 * pending badges) is the way in. This route stays reachable for the rare case of
 * reviewing everything at once.
 */
export default function AllTimesheetsScreen() {
  return <TimesheetView />;
}
