import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '@/auth/public.decorator';
import { PlaybooksService } from './playbooks.service';
import { ListPlaybooksQueryDto } from './playbook.schemas';

/**
 * Datos de referencia (las plantillas de personaje), iguales para todos y sin
 * dueño. Público de forma permanente, igual que Games.
 */
@Public()
@Controller('playbooks')
export class PlaybooksController {
  constructor(private readonly playbooksService: PlaybooksService) {}

  @Get()
  findAll(@Query() query: ListPlaybooksQueryDto) {
    return this.playbooksService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.playbooksService.findOne(id);
  }
}
