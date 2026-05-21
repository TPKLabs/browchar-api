import { Controller, Get } from '@nestjs/common';
import { PlaybooksService } from './playbooks.service';

@Controller('playbooks')
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Get()
  findAll() {
    return this.playbooksService.findAll();
  }
}