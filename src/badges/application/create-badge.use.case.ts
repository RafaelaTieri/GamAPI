import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';

import type {
    TBadge,
    TBadgeRuleOperator,
    TCreateBadgeInput,
} from '../domain/badge.entities';
import { BadgeGateway } from '../domain/badge.gateway';

@Injectable()
export class CreateBadgeUseCase {
    constructor(private readonly badgeGateway: BadgeGateway) {}

    async execute(badgeInput: TCreateBadgeInput): Promise<TBadge> {
        this.validateBadgeInput(badgeInput);

        const associatedProject = await this.badgeGateway.findProjectById(
            badgeInput.projectId,
        );

        if (
            !associatedProject?.active ||
            !associatedProject.applicationActive
        ) {
            throw new NotFoundException('Projeto não encontrado ou inativo.');
        }

        const normalizedBadgeIri = badgeInput.iri.trim();

        const registeredBadgeWithIri =
            await this.badgeGateway.findByIri(normalizedBadgeIri);

        if (registeredBadgeWithIri) {
            throw new ConflictException('Insígnia já cadastrada.');
        }

        return this.badgeGateway.createBadge({
            name: badgeInput.name.trim(),
            description: badgeInput.description.trim(),
            iri: normalizedBadgeIri,
            projectId: badgeInput.projectId,
            imageUrl: badgeInput.imageUrl?.trim() || null,
            ruleOperator: badgeInput.ruleOperator ?? 'ALL',
        });
    }

    private validateBadgeInput(badgeInput: TCreateBadgeInput): void {
        if (
            !badgeInput ||
            typeof badgeInput.name !== 'string' ||
            typeof badgeInput.description !== 'string' ||
            typeof badgeInput.iri !== 'string' ||
            typeof badgeInput.projectId !== 'string'
        ) {
            throw new BadRequestException('Dados da insígnia inválidos.');
        }

        if (
            !badgeInput.name.trim() ||
            !badgeInput.description.trim() ||
            !badgeInput.iri.trim() ||
            !badgeInput.projectId.trim()
        ) {
            throw new BadRequestException('Preencha os campos obrigatórios.');
        }

        if (
            badgeInput.imageUrl != null &&
            typeof badgeInput.imageUrl !== 'string'
        ) {
            throw new BadRequestException('URL da imagem inválida.');
        }

        this.validateRuleOperator(badgeInput.ruleOperator);
        this.validateBadgeIri(badgeInput.iri);
    }

    private validateRuleOperator(ruleOperator?: TBadgeRuleOperator): void {
        if (
            ruleOperator !== undefined &&
            ruleOperator !== 'ALL' &&
            ruleOperator !== 'ANY'
        ) {
            throw new BadRequestException('Operador de regras inválido.');
        }
    }

    private validateBadgeIri(badgeIri: string): void {
        try {
            new URL(badgeIri.trim());
        } catch {
            throw new BadRequestException('IRI da insígnia inválida.');
        }
    }
}
