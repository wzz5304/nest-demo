import { Controller, Get } from '@nestjs/common';
import { JobService } from './job.service';

@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  getHello(): string {
    return this.jobService.getHello();
  }

  @Get('/start-spider')
  startSpider() {
    this.jobService.startSpider();
    return '爬虫已启动';
  }
}
