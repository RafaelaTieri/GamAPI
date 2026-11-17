import { Body, Controller, Post } from '@nestjs/common';

import { CreateApplicationUseCase } from '../application/create-application.use.case';

import type {
    TApplication,
    TCreateApplication,
} from '../domain/configuration.entities';

@Controller('applications')
export class ApplicationsController {
    constructor(
        private readonly createApplicationUseCase: CreateApplicationUseCase,
    ) {}

    @Post()
    async create(@Body() params: TCreateApplication): Promise<TApplication> {
        return this.createApplicationUseCase.execute(params);
    }
}
