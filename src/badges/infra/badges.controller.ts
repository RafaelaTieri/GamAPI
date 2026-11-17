import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { CreateBadgeUseCase } from '../application/create-badge.use.case';
import { CreateBadgeRuleUseCase } from '../application/create-badge-rule.use.case';
import { GetEarnedBadgesUseCase } from '../application/get-earned-badges.use.case';

import type {
    TBadge,
    TBadgeRule,
    TCreateBadgeInput,
    TCreateBadgeRuleInput,
} from '../domain/badge.entities';

@Controller('badges')
export class BadgesController {
    constructor(
        private readonly createBadgeUseCase: CreateBadgeUseCase,
        private readonly createBadgeRuleUseCase: CreateBadgeRuleUseCase,
        private readonly getEarnedBadgesUseCase: GetEarnedBadgesUseCase,
    ) {}

    @Post()
    async createBadge(@Body() params: TCreateBadgeInput): Promise<TBadge> {
        return this.createBadgeUseCase.execute(params);
    }

    @Get('earned')
    async getEarnedBadges(
        @Query('mbox') mbox: string,
    ): Promise<Awaited<ReturnType<GetEarnedBadgesUseCase['execute']>>> {
        return this.getEarnedBadgesUseCase.execute(mbox);
    }

    @Post(':badgeId/rules')
    async createRule(
        @Param('badgeId') badgeId: string,
        @Body() params: TCreateBadgeRuleInput,
    ): Promise<TBadgeRule> {
        return this.createBadgeRuleUseCase.execute(badgeId, params);
    }
}
