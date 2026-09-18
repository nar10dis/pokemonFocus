import { IsString, MaxLength, MinLength } from 'class-validator';

export class FriendRequestDto {
  /** pseudo ou ID dresseur (ex : "sacha", "12", "#00012") */
  @IsString()
  @MinLength(1, { message: 'Entre un pseudo ou un ID dresseur' })
  @MaxLength(30)
  query: string;
}
