import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type {
    TBadge,
    TBadgeRule,
    TCreateBadgeRuleInput,
} from '../domain/badge.entities';
import { BadgeGateway } from '../domain/badge.gateway';

@Injectable()
export class CreateBadgeRuleUseCase {
    constructor(private readonly badgeGateway: BadgeGateway) {}

    async execute(
        badgeId: string,
        ruleInput: TCreateBadgeRuleInput,
    ): Promise<TBadgeRule> {
        if (typeof badgeId !== 'string' || !badgeId.trim()) {
            throw new BadRequestException('Informe a insígnia.');
        }

        const targetBadge = await this.badgeGateway.findById(badgeId);

        if (!targetBadge?.active) {
            throw new NotFoundException('Insígnia não encontrada ou inativa.');
        }

        if (!ruleInput || !ruleInput.type) {
            throw new BadRequestException('Informe o tipo da regra.');
        }

        if (ruleInput.type === 'POINTS_THRESHOLD') {
            return this.createPointsThresholdRule(targetBadge, ruleInput);
        }

        if (ruleInput.type === 'CHALLENGE_COMPLETED') {
            return this.createChallengeCompletionRule(targetBadge, ruleInput);
        }

        throw new BadRequestException('Tipo de regra inválido.');
    }

    private async createPointsThresholdRule(
        targetBadge: TBadge,
        ruleInput: TCreateBadgeRuleInput,
    ): Promise<TBadgeRule> {
        if (
            !Number.isInteger(ruleInput.requiredPoints) ||
            (ruleInput.requiredPoints ?? 0) <= 0 ||
            ruleInput.challengeId != null
        ) {
            throw new BadRequestException('Pontuação da regra inválida.');
        }

        const alreadyHasPointsRule = targetBadge.rules.some(
            (registeredRule) => registeredRule.type === 'POINTS_THRESHOLD',
        );

        if (alreadyHasPointsRule) {
            throw new ConflictException(
                'A insígnia já possui uma regra de pontos.',
            );
        }

        return this.badgeGateway.createRule({
            badgeId: targetBadge.id,
            type: 'POINTS_THRESHOLD',
            requiredPoints: ruleInput.requiredPoints!,
            challengeId: null,
        });
    }

    private async createChallengeCompletionRule(
        targetBadge: TBadge,
        ruleInput: TCreateBadgeRuleInput,
    ): Promise<TBadgeRule> {
        if (
            typeof ruleInput.challengeId !== 'string' ||
            !ruleInput.challengeId.trim() ||
            ruleInput.requiredPoints != null
        ) {
            throw new BadRequestException(
                'Desafio informado na regra é inválido.',
            );
        }

        const requiredChallenge = await this.badgeGateway.findChallengeById(
            ruleInput.challengeId,
        );

        if (!requiredChallenge?.active) {
            throw new NotFoundException('Desafio não encontrado ou inativo.');
        }

        const isChallengeLinkedToProject =
            await this.badgeGateway.isChallengeLinkedToProject(
                targetBadge.projectId,
                requiredChallenge.id,
            );

        if (!isChallengeLinkedToProject) {
            throw new BadRequestException(
                'Desafio não associado ao projeto da insígnia.',
            );
        }

        this.assertChallengeRuleNotDuplicated(
            targetBadge,
            requiredChallenge.id,
        );

        return this.badgeGateway.createRule({
            badgeId: targetBadge.id,
            type: 'CHALLENGE_COMPLETED',
            requiredPoints: null,
            challengeId: requiredChallenge.id,
        });
    }

    private assertChallengeRuleNotDuplicated(
        targetBadge: TBadge,
        challengeId: string,
    ): void {
        const alreadyRequiresChallenge = targetBadge.rules.some(
            (registeredRule) => registeredRule.challengeId === challengeId,
        );

        if (alreadyRequiresChallenge) {
            throw new ConflictException(
                'Esse desafio já é requisito da insígnia.',
            );
        }
    }
}
