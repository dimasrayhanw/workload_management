import { Card, CardContent } from "@/components/ui/card";

interface Job {
  count: number;
  hours_per_job: number;
}

const TotalHours = ({ jobs }: { jobs: Job[] }) => {
  const total = jobs.reduce((sum, job) => sum + job.count * job.hours_per_job, 0);

  return (
    <Card>
      <CardContent className="p-4 text-lg font-medium">
        Total Estimated Hours: {total} hours
      </CardContent>
    </Card>
  );
};

export default TotalHours;